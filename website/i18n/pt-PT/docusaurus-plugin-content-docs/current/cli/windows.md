---
sidebar_position: 3
title: Windows e WSL
description: "Como usar a CLI no Windows 10/11 a partir do PowerShell ou do cmd, e registar o servidor nos clientes do Windows a partir do WSL."
---

# Windows e WSL

Tudo na CLI foi feito para funcionar no PowerShell ou na cmd do Windows 10/11 com Node.js 20 ou mais recente. Está
implementado e coberto por testes unitários, mas ainda não passou por um teste manual numa instalação nativa do
Windows. A ponte com o WSL, abaixo, foi verificada de ponta a ponta.

- O ficheiro de definições fica em `%APPDATA%\plane\.env`, protegido pelas permissões por utilizador dessa pasta
  (os modos de ficheiro não significam nada no Windows).
- `plane mcp boot enable` regista uma tarefa de logon.
- `plane mcp stop` pede ao servidor que se desligue através de um `POST /shutdown` protegido por token antes de
  recorrer a terminá-lo.
- As CLIs dos clientes correm através do `cross-spawn`, pelo que os shims `.cmd` do Windows funcionam.

## A partir do WSL

Quando o pacote está instalado dentro do WSL, `plane mcp install` e `uninstall` também listam os clientes
instalados do lado do Windows, como `Claude Code (Windows)` e assim por diante (`--client claude@windows`). Eles
iniciam o servidor com `wsl.exe -d <distro> -e node …/dist/mcp/cli.js`, pelo que continua a ler a configuração
guardada dentro do WSL. A primeira chamada depois de o WSL estar inativo paga o arranque da distro (um ou dois
segundos).

O lado do Windows é alcançado através do `powershell.exe`, obtido a partir do PATH ou, com
`appendWindowsPath = false`, de `/mnt/c/Windows/System32/WindowsPowerShell/v1.0/`. Quando não pode ser alcançado,
`--client claude@windows` indica qual o passo que falhou.

Para iniciar o servidor no login dentro do WSL, ative primeiro o systemd em `/etc/wsl.conf`, e depois execute
`npx plane mcp boot enable`.
