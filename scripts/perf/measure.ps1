# Measures idle memory (process tree incl. WebView2) and time-to-window for a built app.
# Usage: pwsh scripts/perf/measure.ps1 -Exe path\to\app.exe [-IdleSeconds 8] [-Runs 3]
param([Parameter(Mandatory)][string]$Exe, [string[]]$ExeArgs = @(), [int]$IdleSeconds = 8, [int]$Runs = 3)

function Get-Tree($rootId) {
  $all = Get-CimInstance Win32_Process
  $ids = @($rootId); $queue = @($rootId)
  while ($queue.Count) {
    $cur = $queue[0]; $queue = $queue[1..($queue.Count)]
    foreach ($c in $all | Where-Object { $_.ParentProcessId -eq $cur }) { $ids += $c.ProcessId; $queue += $c.ProcessId }
  }
  $ids
}

$results = @()
for ($i = 0; $i -lt $Runs; $i++) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  if ($ExeArgs.Count) { $p = Start-Process -FilePath $Exe -ArgumentList $ExeArgs -PassThru } else { $p = Start-Process -FilePath $Exe -PassThru }
  while (-not $p.HasExited -and $p.MainWindowHandle -eq 0 -and $sw.Elapsed.TotalSeconds -lt 30) { Start-Sleep -Milliseconds 20; $p.Refresh() }
  $startMs = $sw.ElapsedMilliseconds
  Start-Sleep -Seconds $IdleSeconds
  $ids = Get-Tree $p.Id
  $ws = (Get-Process -Id $ids -ErrorAction SilentlyContinue | Measure-Object WorkingSet64 -Sum).Sum
  $priv = (Get-Process -Id $ids -ErrorAction SilentlyContinue | Measure-Object PrivateMemorySize64 -Sum).Sum
  $cpu1 = (Get-Process -Id $ids -ErrorAction SilentlyContinue | Measure-Object CPU -Sum).Sum
  Start-Sleep -Seconds 5
  $cpu2 = (Get-Process -Id $ids -ErrorAction SilentlyContinue | Measure-Object CPU -Sum).Sum
  $results += [pscustomobject]@{ WindowMs = $startMs; WorkingSetMB = [math]::Round($ws/1MB,1); PrivateMB = [math]::Round($priv/1MB,1); IdleCpuPct = [math]::Round((($cpu2-$cpu1)/5)*100,1); Procs = $ids.Count }
  Get-Process -Id $ids -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Seconds 2
}
$results | Format-Table -AutoSize
"median WindowMs=" + (($results.WindowMs | Sort-Object)[[int]($Runs/2)]) + "  median WorkingSetMB=" + (($results.WorkingSetMB | Sort-Object)[[int]($Runs/2)])
