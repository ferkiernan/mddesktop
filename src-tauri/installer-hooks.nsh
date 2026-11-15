; NSIS hooks for the MD Desktop installer (Tauri `bundle.windows.nsis.installerHooks`).
; Tauri registers .md/.markdown under the "Markdown Document" class with the app icon; after that,
; point the class at the document icon (file_icon.ico, installed next to the executable as a resource)
; and tell Explorer to refresh its icon cache.

!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr SHCTX "Software\Classes\Markdown Document\DefaultIcon" "" "$INSTDIR\file_icon.ico,0"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend
