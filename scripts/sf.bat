@echo off

:: ====================================================
:: Usage:
::   ReplaceFile.bat "C:\path\to\oldFile.ext" "C:\path\to\newFile.ext"
:: ====================================================

:: Validate arguments
if "%~2"=="" (
    echo Usage: %~nx0 "oldFile" "newFile"
    echo Example:
    echo   %~nx0 "C:\Program Files\MyApp\old.exe" "C:\temp\new.exe"
    endlocal & exit /b 1
)

set "oldFile=%~1"
set "newFile=%~2"

:: ====================================================
:: Check if running as admin. Use net session, which requires admin.
:: If not, relaunch this script with elevated privileges.
:: ====================================================
@echo off

:: BatchGotAdmin
:-------------------------------------
REM  --> Check for permissions
    IF "%PROCESSOR_ARCHITECTURE%" EQU "amd64" (
>nul 2>&1 "%SYSTEMROOT%\SysWOW64\cacls.exe" "%SYSTEMROOT%\SysWOW64\config\system"
) ELSE (
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
)

REM --> If error flag set, we do not have admin.
if '%errorlevel%' NEQ '0' (
    echo Requesting administrative privileges...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    set "params="%oldFile%" "%newFile%""
    set "params=%params:"=""%"
    echo UAC.ShellExecute "cmd.exe", "/c ""%~s0 %params%"" ", "", "runas", 1 >> "%temp%\getadmin.vbs"

    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    :: ====================================================
    :: Now running as admin
    :: ====================================================

    :: Verify that the source file exists
    if not exist "%newFile%" (
        echo ERROR: source file not found:
        echo        "%newFile%"
        endlocal & exit /b 1
    )

    :: Ensure the destination directory exists; create it if not
    for %%I in ("%oldFile%") do set "targetDir=%%~dpI"
    if not exist "%targetDir%" (
        mkdir "%targetDir%" >nul 2>&1
        if errorlevel 1 (
            echo ERROR: unable to create directory:
            echo        "%targetDir%"
            endlocal & exit /b 1
        )
    )

    :: Delete the existing target file if it exists
    if exist "%oldFile%" (
        del /f /q "%oldFile%" >nul 2>&1
        if errorlevel 1 (
            echo ERROR: failed to delete existing file:
            echo        "%oldFile%"
            endlocal & exit /b 1
        )
    )

    :: Copy the new file into place
    copy /y "%newFile%" "%oldFile%" >nul
    if errorlevel 1 (
        echo ERROR: failed to copy file.
        endlocal & exit /b 1
    )

    echo File replaced successfully.
    endlocal
    exit /b 0
