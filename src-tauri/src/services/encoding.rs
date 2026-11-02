//! BOM / encoding detection and EOL handling. The frontend always sees `\n`.

use crate::error::{AppError, AppResult, ErrorCode};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Eol {
    Lf,
    Crlf,
}

#[derive(Debug)]
pub struct Decoded {
    pub text: String,
    pub encoding: String,
    pub bom: bool,
    pub eol: Eol,
}

fn detect_eol(text: &str) -> Eol {
    let crlf = text.matches("\r\n").count();
    let lf = text.matches('\n').count() - crlf;
    if crlf > lf { Eol::Crlf } else { Eol::Lf }
}

fn undetectable(msg: &str) -> AppError {
    AppError::new(ErrorCode::EncodingUndetectable, msg)
}

pub fn decode(bytes: &[u8]) -> AppResult<Decoded> {
    let (text, encoding, bom) = if let Some(rest) = bytes.strip_prefix(&[0xEF, 0xBB, 0xBF]) {
        let t = std::str::from_utf8(rest).map_err(|_| undetectable("invalid UTF-8 after BOM"))?;
        (t.to_owned(), "utf-8".to_owned(), true)
    } else if bytes.starts_with(&[0xFF, 0xFE]) || bytes.starts_with(&[0xFE, 0xFF]) {
        let enc = if bytes[0] == 0xFF { encoding_rs::UTF_16LE } else { encoding_rs::UTF_16BE };
        let (t, bad) = enc.decode_without_bom_handling(&bytes[2..]);
        if bad {
            return Err(undetectable("invalid UTF-16"));
        }
        (t.into_owned(), enc.name().to_ascii_lowercase(), true)
    } else if let Ok(t) = std::str::from_utf8(bytes) {
        (t.to_owned(), "utf-8".to_owned(), false)
    } else {
        // chardetng exposes no confidence score; "reliable" means the guess decodes
        // the whole file strictly (no replacement characters).
        let mut det = chardetng::EncodingDetector::new(chardetng::Iso2022JpDetection::Deny);
        det.feed(bytes, true);
        let enc = det.guess(None, chardetng::Utf8Detection::Deny);
        let t = enc
            .decode_without_bom_handling_and_without_replacement(bytes)
            .ok_or_else(|| undetectable("invalid bytes for detected encoding"))?;
        (t.into_owned(), enc.name().to_ascii_lowercase(), false)
    };
    let eol = detect_eol(&text);
    let text = if text.contains('\r') { text.replace("\r\n", "\n") } else { text };
    Ok(Decoded { text, encoding, bom, eol })
}

/// Encodes for disk. Non-UTF-8 sources require explicit conversion consent.
pub fn encode(
    text: &str,
    eol: Eol,
    bom: bool,
    encoding: &str,
    convert_to_utf8: bool,
) -> AppResult<Vec<u8>> {
    let is_utf8 = encoding.eq_ignore_ascii_case("utf-8");
    if !is_utf8 && !convert_to_utf8 {
        return Err(AppError::new(
            ErrorCode::EncodingConversionRequired,
            format!("file was read as {encoding}; saving converts it to UTF-8"),
        ));
    }
    let body = if eol == Eol::Crlf { text.replace('\n', "\r\n") } else { text.to_owned() };
    let mut out = Vec::with_capacity(body.len() + 3);
    if is_utf8 && bom {
        out.extend_from_slice(&[0xEF, 0xBB, 0xBF]);
    }
    out.extend_from_slice(body.as_bytes());
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn utf8_plain_and_crlf_roundtrip() {
        let src = b"# T\r\nline\r\n";
        let d = decode(src).unwrap();
        assert_eq!((d.text.as_str(), d.eol, d.bom), ("# T\nline\n", Eol::Crlf, false));
        assert_eq!(encode(&d.text, d.eol, d.bom, &d.encoding, false).unwrap(), src);
    }

    #[test]
    fn utf8_bom_is_preserved() {
        let src = b"\xEF\xBB\xBFhola\n";
        let d = decode(src).unwrap();
        assert!(d.bom);
        assert_eq!(d.text, "hola\n");
        assert_eq!(encode(&d.text, d.eol, d.bom, &d.encoding, false).unwrap(), src);
    }

    #[test]
    fn utf16_with_bom_decodes_and_needs_conversion() {
        let mut src = vec![0xFF, 0xFE];
        for u in "ñandú\n".encode_utf16() {
            src.extend_from_slice(&u.to_le_bytes());
        }
        let d = decode(&src).unwrap();
        assert_eq!(d.text, "ñandú\n");
        assert_eq!(
            encode(&d.text, d.eol, d.bom, &d.encoding, false).unwrap_err().code,
            ErrorCode::EncodingConversionRequired
        );
        assert_eq!(encode(&d.text, d.eol, false, &d.encoding, true).unwrap(), "ñandú\n".as_bytes());
    }

    #[test]
    fn windows_1252_is_detected_or_rejected_never_corrupted() {
        let src = "La canción del año. Niño, camión, señal, corazón y también árbol.\n".repeat(5);
        let (bytes, _, _) = encoding_rs::WINDOWS_1252.encode(&src);
        match decode(&bytes) {
            Ok(d) => assert_ne!(d.encoding, "utf-8"),
            Err(e) => assert_eq!(e.code, ErrorCode::EncodingUndetectable),
        }
    }
}
