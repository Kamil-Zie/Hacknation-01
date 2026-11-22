# Wdrożenie prod: Synology DSM + Cloudflare Tunnel

Prod działa na Synology DS225+ (Container Manager). Ruch z internetu idzie wyłącznie przez Cloudflare Tunnel istniejącego kontenera `cloudflare-synology-kamil` (sieć **host**), więc **na routerze nie otwieramy żadnego portu**. Baza: MongoDB Atlas, klaster `hacknation`, baza `hacknation_prod`.

## Porty

### Kontenery (projekt Compose `hacknation`, wspólna sieć `hacknation`)

| Kontener | Port w kontenerze | Port na NAS-ie (tylko 127.0.0.1, do diagnostyki) | Co to jest |
|---|---|---|---|
| `frontend` | **80** | **18080** | nginx serwujący zbudowany frontend (Vite `dist/`) |
| `backend` | **3000** | **13000** | API Node/Express (`PORT=3000`), prefiks `/api/v1` |
| `cloudflare-synology-kamil` | — | — | istniejący tunel na NAS-ie (sieć host), poza projektem; tylko połączenia wychodzące |

Tunel łączy się z `localhost:18080` i `localhost:13000`. Porty są wystawione tylko na `127.0.0.1`: z sieci LAN ani z internetu nie są dostępne, a po SSH na NAS sprawdzisz backend przez `curl localhost:13000/api/v1/health`.

### Cloudflare Tunnel: Public Hostnames (USTALONE)

Tunel kontenera `cloudflare-synology-kamil` (sieć host) → Zero Trust → Networks → Tunnels → Public Hostname:

| Subdomena | Domena | Typ usługi | URL usługi |
|---|---|---|---|
| `app` | `kamil-zielinski.pl` | HTTP | `localhost:18080` |
| `api` | `kamil-zielinski.pl` | HTTP | `localhost:13000` |

`cloudflared` w sieci host widzi porty NAS-a jako `localhost`, więc kontenery projektu wystawiają porty tylko na `127.0.0.1` (niewidoczne z LAN i internetu).

Typ **HTTP**, nie HTTPS: szyfrowanie robi Cloudflare (przeglądarka ↔ Cloudflare) i tunel (Cloudflare ↔ NAS). Wewnątrz NAS-a ruch idzie po sieci Dockera.

### Ruch wychodzący z NAS-a (zapora DSM i router)

| Port | Protokół | Dokąd | Po co |
|---|---|---|---|
| 7844 | TCP i UDP | Cloudflare (`region1/2.v2.argotunnel.com`) | tunel `cloudflare-synology-kamil` (już działa) |
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

networks:
  hacknation:
```

W repo: `docker-compose.prod.yml` (budowanie obrazów na NAS-ie z kodu, bez GHCR), `apps/backend/Dockerfile`, `apps/frontend/Dockerfile` + `nginx.conf`. Powyższy blok to docelowy układ portów. Bez własnego kontenera `cloudflared`: tunel zapewnia istniejący `cloudflare-synology-kamil`.

## Zmienne prod

| Zmienna | Gdzie | Wartość |
|---|---|---|
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
2. Cloudflare Zero Trust: w tunelu kontenera `cloudflare-synology-kamil` dodaj dwa Public Hostnames z tabeli wyżej (`localhost:18080`, `localhost:13000`).
3. Sprawdź w Container Manager, że żaden inny kontener nie publikuje portów 18080 i 13000.
4. Atlas: użytkownik prod z `readWrite` tylko do `hacknation_prod`; URI do `.env.prod`.
5. Po szkielecie: `docker compose pull && docker compose up -d` w folderze projektu na NAS-ie.
6. Sprawdź: `curl -s https://api.kamil-zielinski.pl/api/v1/health` zwraca 200, `https://app.kamil-zielinski.pl` ładuje aplikację, w konsoli przeglądarki brak błędów CORS.

## Wdrożenie: obrazy z GitHub Actions, NAS tylko pobiera (zalecane, T-065)

Na NAS-ie nic się nie buduje i nie działa npm (Container Manager zawieszał się na instalacji npm). Workflow `.github/workflows/images.yml` po każdym pushu na `main`: skan sekretów (pliki + cała historia), budowa obrazów backend i frontend dla `linux/amd64` i `linux/arm64`, push do `ghcr.io/kamil-zie/hacknation-{backend,frontend}:latest`.

Raz, w GitHubie: Profil → Packages → `hacknation-backend` i `hacknation-frontend` → Package settings → Change visibility → Public (bez tego NAS musi logować się do ghcr.io).

Na NAS-ie bez SSH (DSM):
1. File Station: folder `/docker/hacknation`, wgraj `deploy/docker-compose.yml` i `.env.prod` (wzór `deploy/env.prod.example`).
2. Container Manager → Projekt → Utwórz: nazwa `hacknation`, ścieżka `/docker/hacknation`, źródło: istniejący `docker-compose.yml` → Dalej → Gotowe.
3. Aktualizacja po nowym commicie (gdy workflow `images` jest zielony): Projekt `hacknation` → Akcja → Zbuduj (pobiera `:latest` ponownie).

## Wdrożenie krok po kroku (ręczny klon, budowanie na NAS-ie, T-065)

```bash
# 1. Kod na NAS (repo prywatne: token GitHub tylko do odczytu albo rsync z laptopa bez .env)
ssh <user>@<nas> && sudo -i
mkdir -p /volume1/docker/hacknation && cd /volume1/docker/hacknation
git clone https://github.com/Kamil-Zie/Hacknation-01.git app && cd app   # potem: git pull

# 2. Sekrety tylko tutaj
cat > .env.prod <<EOT
NODE_ENV=production
PORT=3000
MONGODB_URI=<URI użytkownika prod>
MONGODB_DB=hacknation_prod
CORS_ORIGIN=https://app.kamil-zielinski.pl
JWT_SECRET=$(openssl rand -hex 32)
EOT
chmod 600 .env.prod

# 3. Budowa i start
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps        # backend: healthy
curl -s localhost:13000/api/v1/health && curl -sI localhost:18080 | head -1

# 4. Aktualizacja po zmianach na main
git pull && docker compose -f docker-compose.prod.yml up -d --build
```

Adres API frontendu jest wkompilowany przy budowie (`VITE_API_URL` w `docker-compose.prod.yml`); bez niego frontend działa na mockach.
