---
sidebar_position: 3
title: Windows e WSL
---

# Windows e WSL

Tudo na CLI foi feito para funcionar no PowerShell ou no cmd do Windows 10/11 com Node.js 20 ou mais recente. Está
implementado e coberto por testes unitários, mas ainda não passou por um teste manual numa instalação nativa do
Windows. A ponte com o WSL, abaixo, foi verificada de ponta a ponta.

- O arquivo de configurações fica em `%APPDATA%\plane\.env`, protegido pelas permissões por usuário dessa pasta
  (modos de arquivo não significam nada no Windows).
- `plane mcp boot enable` registra uma tarefa de logon.
- `plane mcp stop` pede ao servidor que desligue por um `POST /shutdown` protegido por token antes de recorrer a
  encerrá-lo.
- As CLIs dos clientes rodam via `cross-spawn`, então os shims `.cmd` do Windows funcionam.

## A partir do WSL

Quando o pacote está instalado dentro do WSL, `plane mcp install` e `uninstall` também listam os clientes
instalados do lado do Windows, como `Claude Code (Windows)` e assim por diante (`--client claude@windows`). Eles
iniciam o servidor com `wsl.exe -d <distro> -e node …/dist/mcp/cli.js`, então ele continua lendo a configuração
salva dentro do WSL. A primeira chamada depois de o WSL ficar ocioso paga o início da distro (um ou dois
segundos).

O lado do Windows é alcançado pelo `powershell.exe`, tirado do PATH ou, com `appendWindowsPath = false`, de
`/mnt/c/Windows/System32/WindowsPowerShell/v1.0/`. Quando ele não pode ser alcançado, `--client claude@windows`
diz qual passo falhou.

Para iniciar o servidor no login dentro do WSL, ative o systemd em `/etc/wsl.conf` antes e depois rode
`npx plane mcp boot enable`.
