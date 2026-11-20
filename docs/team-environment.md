# Środowiska zespołu i końcówki linii (LF/CRLF)

## Kto na czym pracuje

| Osoba | member-id | System |
|---|---|---|
| Kamil Zieliński | coord-1 | Ubuntu |
| Jakub Grzywiński | frontend-2 | Ubuntu |
| Dawid Jurek | frontend-1 | Windows |
| Jan Mickiewicz | backend-1 | Windows |
| Nataniel Gadziński | backend-2 | Windows |

Źródło prawdy: `project.json → teams.*.members[].os`.

## Zasada: w repo zawsze LF

`.gitattributes` wymusza LF dla wszystkich plików tekstowych (CRLF zostaje tylko w `*.bat`, `*.cmd`, `*.ps1`).
Hook albo skrypt z CRLF nie uruchomi się na Ubuntu ani w Git Bash: `cannot exec '.githooks/pre-commit'`
albo `/bin/sh^M: bad interpreter`.

Najczęstsza przyczyna: pliki **skopiowane z Windows na Ubuntu** (pendrive, chmura, zip) zamiast pobrania przez `git clone` / `git pull`.
Git ma je wtedy w indeksie z LF, ale w kopii roboczej leżą z CRLF.

## Windows (Dawid, Jan, Nataniel)

```bash
git config --global core.autocrlf false   # o końcówkach decyduje .gitattributes
git config --global core.eol lf
```

Edytor (VS Code): `"files.eol": "\n"` (`.editorconfig` też ustawia `end_of_line = lf`).
Pliki do innych osób przekazujemy wyłącznie przez git, nie przez kopiowanie.

## Jak sprawdzić i naprawić

```bash
# pliki, które w kopii roboczej mają CRLF, a powinny mieć LF
git ls-files --eol | awk '$2=="w/crlf" && $0 !~ /eol=crlf/'
```

Pliki **bez lokalnych zmian** wypakuj z gita od nowa (zmiany w treści nie znikają, bo ich nie ma):

```bash
git ls-files --eol | awk '$2=="w/crlf" && $0 !~ /eol=crlf/ {print $NF}' > /tmp/crlf.txt
xargs rm -- < /tmp/crlf.txt && xargs git checkout -- < /tmp/crlf.txt
```

Pliki **z lokalnymi zmianami**: `git add --renormalize <plik>` przed commitem (zapisze LF do repo).
