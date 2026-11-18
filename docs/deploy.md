# Wdrożenie prod: Synology DSM + Cloudflare Tunnel

Prod działa na Synology DS225+ (Container Manager). Ruch z internetu idzie wyłącznie przez Cloudflare Tunnel, więc **na routerze nie otwieramy żadnego portu**. Baza: MongoDB Atlas, klaster `hacknation`, baza `hacknation_prod`.

## Porty

### Kontenery (projekt Compose `hacknation`, wspólna sieć `hacknation`)

| Kontener | Port w kontenerze | Port na NAS-ie (tylko 127.0.0.1, do diagnostyki) | Co to jest |
|---|---|---|---|
| `frontend` | **80** | **18080** | nginx serwujący zbudowany frontend (Vite `dist/`) |
| `backend` | **3000** | **13000** | API Node/Express (`PORT=3000`), prefiks `/api/v1` |
| `cloudflared` | — | — | tunel do Cloudflare; tylko połączenia wychodzące, nic nie publikuje |

`cloudflared` łączy się z kontenerami po nazwach w sieci Dockera (`frontend:80`, `backend:3000`). Porty 18080 i 13000 są wystawione tylko na `127.0.0.1`, żeby po SSH na NAS dało się sprawdzić `curl localhost:13000/api/v1/health`; z sieci LAN ani z internetu nie są dostępne.

### Cloudflare Tunnel: Public Hostnames

Zero Trust → Networks → Tunnels → `hacknation` → Public Hostname:

| Subdomena | Domena | Typ usługi | URL usługi |
|---|---|---|---|
| `app` | `kamil-zielinski.pl` | HTTP | `frontend:80` |
| `api` | `kamil-zielinski.pl` | HTTP | `backend:3000` |

Typ **HTTP**, nie HTTPS: szyfrowanie robi Cloudflare (przeglądarka ↔ Cloudflare) i tunel (Cloudflare ↔ NAS). Wewnątrz NAS-a ruch idzie po sieci Dockera.

Jeśli `cloudflared` działa poza Compose (pakiet DSM albo osobny kontener bez sieci `hacknation`), zamiast nazw kontenerów użyj `http://<IP-NAS>:18080` i `http://<IP-NAS>:13000`, a w `docker-compose.yml` zmień wiązanie z `127.0.0.1:` na `<IP-NAS>:`.

### Ruch wychodzący z NAS-a (zapora DSM i router)

| Port | Protokół | Dokąd | Po co |
|---|---|---|---|
| 7844 | TCP i UDP | Cloudflare (`region1/2.v2.argotunnel.com`) | tunel (QUIC; fallback HTTP/2) |
| 443 | TCP | Cloudflare, GitHub (GHCR), npm | API tunelu, pobieranie obrazów |
| 27017 | TCP | `*.mongodb.net` | MongoDB Atlas |

Domyślnie DSM nie blokuje ruchu wychodzącego. Jeśli masz reguły zapory na wyjście, dopuść te trzy.

### Ruch przychodzący

**Żaden.** Bez przekierowań portów na routerze, bez QuickConnect i bez wystawiania DSM (5000/5001) do internetu. Panel DSM zostaje dostępny tylko w LAN.

### Porty zajęte przez DSM (nie używać)

22 (SSH), 80/443 (Web Station, reverse proxy), 873 (rsync), 3306 (MariaDB), 5000/5001 (DSM), 5005/5006 (WebDAV), 6690 (Drive). Dlatego kontenery wystawiamy na 18080 i 13000.

## docker-compose.yml (prod, na NAS-ie)

```yaml
name: hacknation
services:
  frontend:
    image: ghcr.io/kamil-zie/hacknation-frontend:latest
    restart: unless-stopped
    ports: ["127.0.0.1:18080:80"]
    networks: [hacknation]

  backend:
    image: ghcr.io/kamil-zie/hacknation-backend:latest
    restart: unless-stopped
    env_file: .env.prod            # MONGODB_URI (hacknation_prod), CORS_ORIGIN, PORT=3000, NODE_ENV=production
    ports: ["127.0.0.1:13000:3000"]
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    networks: [hacknation]

  cloudflared:
    image: cloudflare/cloudflared:latest # po pierwszym działającym starcie przypnij konkretną wersję
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      TUNNEL_TOKEN: ${TUNNEL_TOKEN} # z .env na NAS-ie, nigdy w repo
    depends_on: [frontend, backend]
    networks: [hacknation]

networks:
  hacknation:
```

Plik i Dockerfile'e aplikacji tworzy `coord-devops` w fazie Szkielet; powyższe to docelowy układ portów, którego ma się trzymać.

## Zmienne prod

| Zmienna | Gdzie | Wartość |
|---|---|---|
| `TUNNEL_TOKEN` | `.env` obok compose na NAS-ie | token tunelu z Cloudflare Zero Trust |
| `MONGODB_URI` | `.env.prod` na NAS-ie | URI użytkownika prod do bazy `hacknation_prod` |
| `PORT` | `.env.prod` | `3000` |
| `NODE_ENV` | `.env.prod` | `production` |
| `CORS_ORIGIN` | `.env.prod` | `https://app.kamil-zielinski.pl` |
| `VITE_API_URL` | build obrazu frontendu (GitHub Actions) | `https://api.kamil-zielinski.pl/api/v1` |

Pliki `.env*` z prawdziwymi wartościami są tylko na NAS-ie (uprawnienia 600), nigdy w repo.

## Ustawienia Cloudflare (domena kamil-zielinski.pl)

- SSL/TLS: tryb **Full**, **Always Use HTTPS**: on, minimalny TLS 1.2.
- Rekordy DNS `app` i `api` tworzy sam tunel (CNAME na `<id>.cfargotunnel.com`, proxied). Nie dodawaj ich ręcznie jako A.
- Caching: reguła **Bypass cache** dla `api.kamil-zielinski.pl/*`; frontend może być cache'owany (pliki z hashem w nazwie).
- Network: **WebSockets** on (jeśli demo ich użyje).
- Security: Bot Fight Mode **off** na czas pokazu (potrafi blokować wywołania API z frontu).

## Kolejność konfiguracji

1. DSM: Container Manager zainstalowany, użytkownik z dostępem do Dockera, SSH włączone tylko w LAN.
2. Cloudflare Zero Trust: utwórz tunel `hacknation` (typ Cloudflared), skopiuj token do `.env` na NAS-ie.
3. Dodaj dwa Public Hostnames z tabeli wyżej.
4. Atlas: użytkownik prod z `readWrite` tylko do `hacknation_prod`; URI do `.env.prod`.
5. Po szkielecie: `docker compose pull && docker compose up -d` w folderze projektu na NAS-ie.
6. Sprawdź: `curl -s https://api.kamil-zielinski.pl/api/v1/health` zwraca 200, `https://app.kamil-zielinski.pl` ładuje aplikację, w konsoli przeglądarki brak błędów CORS.
