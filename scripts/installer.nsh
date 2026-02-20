; NSIS customization hooks used by electron-builder.
; Keep this file in source control to evolve installer flow over time.

!define KLOOW_CERT_THUMBPRINT "75358677431CEBDF2A7F3B23DD765305F7037A1D"

!macro customInit
  DetailPrint "Preparing Kloow installer wizard."
!macroend

!macro customInstall
  IfFileExists "$INSTDIR\resources\cert.crt" 0 kloow_cert_missing

  ; Machine store only (UAC/elevation path), to keep trust flow consistent.
  DetailPrint "Installing certificate into LocalMachine Root store..."
  nsExec::ExecToLog '"$SYSDIR\certutil.exe" -addstore -f "Root" "$INSTDIR\resources\cert.crt"'
  Pop $0
  StrCmp $0 "0" kloow_cert_done

  DetailPrint "Certificate install failed in LocalMachine Root store (exit code: $0)."
  Goto kloow_cert_done

kloow_cert_missing:
  DetailPrint "No bundled certificate found. Skipping certificate install."

kloow_cert_done:
  DetailPrint "Kloow install/update flow completed."
!macroend

!macro customUnInstall
  ; Machine store cleanup only.
  DetailPrint "Removing certificate from LocalMachine Root store..."
  nsExec::ExecToLog '"$SYSDIR\certutil.exe" -delstore "Root" "${KLOOW_CERT_THUMBPRINT}"'
  Pop $0
  StrCmp $0 "0" kloow_uninstall_done
  DetailPrint "LocalMachine removal failed (exit code: $0)."

kloow_uninstall_done:
  DetailPrint "Kloow remove flow completed."
!macroend
