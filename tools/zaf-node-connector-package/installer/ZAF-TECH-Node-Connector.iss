#define MyAppName "Pi Node Connector"
#define MyAppVersion "1.6.7"
#define MyAppPublisher "ZAF Tech"
#define MyAppExeName "ZAF-TECH-Node-Connector.exe"

[Setup]
AppId={{8B7F5C4D-8A2A-4D7B-9F7B-2E0B0D4C7A31}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppComments=ZAF Tech Pi Node Connector runs as a Windows system tray application.
AppCopyright=Copyright © 2026 ZAF Tech
DefaultDirName={localappdata}\ZAF Tech\Node Connector
DefaultGroupName=ZAF Tech
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\installer-dist
OutputBaseFilename=ZAF-TECH-Node-Connector-Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes
RestartApplications=no
CloseApplicationsFilter=ZAF-TECH-Node-Connector.exe,ZAF-TECH-Node-Connector-Worker.exe
SetupIconFile=zaf-tech-logo.ico
UninstallDisplayIcon={app}\zaf-tech-logo.ico

[Files]
Source: "..\dist\ZAF-TECH-Node-Connector.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\dist\ZAF-TECH-Node-Connector-Worker.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "zaf-tech-logo.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "zaf-tech-logo.png"; DestDir: "{app}"; Flags: ignoreversion

[Tasks]
Name: "startup"; Description: "Start ZAF Tech Node Connector automatically with Windows"; GroupDescription: "Startup options:"; Flags: checkedonce

[Icons]
Name: "{group}\Pi Node Connector"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\zaf-tech-logo.ico"
Name: "{group}\Uninstall Pi Node Connector"; Filename: "{uninstallexe}"

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "ZAF Tech Node Connector"; ValueData: """{app}\{#MyAppExeName}"""; Flags: uninsdeletevalue; Tasks: startup

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Start Pi Node Connector now"; Flags: nowait postinstall skipifsilent
