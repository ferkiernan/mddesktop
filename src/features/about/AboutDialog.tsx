// Ayuda > Acerca de MD Desktop (spec 011): logo, version and build date of this build, author, links.
// Links open in the default browser through an allowlisted command (only these three addresses).
import { useEffect, useRef } from "react";
import logo from "../../../src-tauri/icons/128x128@2x.png";
import { app } from "../../services/ipc";
import { closeAbout, useAbout } from "./aboutStore";

type LinkId = "project" | "library" | "author";

function ExternalLink({ id, children }: { id: LinkId; children: string }) {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        app.openAboutLink(id).catch(() => undefined);
      }}
    >
      {children}
    </a>
  );
}

const buildDate = () => {
  const d = new Date(__BUILD_DATE__);
  return Number.isNaN(d.getTime()) ? __BUILD_DATE__ : d.toLocaleDateString("es", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export function AboutHost() {
  const open = useAbout((s) => s.open);
  return open ? <AboutDialog /> : null;
}

function AboutDialog() {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeAbout();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      previous?.focus?.();
    };
  }, []);

  return (
    <div className="dialog-backdrop">
      <div className="dialog about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title">
        <img className="about-logo" src={logo} alt="Logo de MD Desktop" width={96} height={96} />
        <h2 id="about-title">MD Desktop</h2>
        <p className="about-version">
          Versión {__APP_VERSION__} · compilada el {buildDate()}
        </p>
        <p>Autor: Fernando Manuel Kiernan</p>
        <p>
          Repositorio: <ExternalLink id="project">github.com/ferkiernan/mddesktop</ExternalLink>
        </p>
        <hr />
        <p>
          Basado en la librería <ExternalLink id="library">mdwysiwyg</ExternalLink> (Licencia MIT)
          <br />
          Autor: @ferkiernan
        </p>
        <p>
          Para más información: <ExternalLink id="author">https://github.com/ferkiernan</ExternalLink>
        </p>
        <div className="dialog-actions">
          <button ref={closeRef} className="primary" onClick={closeAbout}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
