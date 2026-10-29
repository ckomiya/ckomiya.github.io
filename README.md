# Dashboard de actividad en GitHub

Dashboard personal de [@ckomiya](https://github.com/ckomiya), publicado en <https://ckomiya.github.io/>. Mi portafolio vive en <https://christiankomiya.com>.

## Cómo funciona

```
GitHub Action (cron diario)  →  scripts/update_data.py  →  data/data.json  →  index.html + app.js (ECharts)
```

1. **`.github/workflows/update-data.yml`** corre todos los días (y a mano con *Run workflow*) y ejecuta el script con el secret `GH_STATS_TOKEN`.
2. **`scripts/update_data.py`** (Python, solo biblioteca estándar) consulta la API REST y GraphQL de GitHub y escribe `data/data.json`. Si algo crítico falla, no toca el JSON; si falla el tráfico de un repo, conserva su histórico.
3. **`index.html` + `style.css` + `app.js`** son una página estática sin build que lee `data/data.json` y dibuja con [ECharts](https://echarts.apache.org/) desde CDN.
4. El Action commitea el JSON si cambió y GitHub Pages republica.

## Detalles

- **Tráfico**: la API solo entrega 14 días, así que el script acumula día a día en `traffic.repos` del JSON (la fecha es la clave, no se duplican días).
- **Commits por semana / día × hora**: commits míos en la rama por defecto de repos públicos propios (sin forks), zona horaria America/Lima.
- **Estado de proyecto**: `activo` = commit en los últimos 30 días, `pausado` = sin commits recientes, `archivado` = repo archivado.
- **Privacidad**: de los repos privados solo se guarda un número agregado (commits del año). Ningún nombre, descripción ni mensaje llega al JSON.
- `404.html` redirige a <https://christiankomiya.com> (enlaces viejos del portafolio anterior).

## Ejecutar en local

```bash
GH_STATS_TOKEN=ghp_... python scripts/update_data.py
python -m http.server 8000   # abrir http://localhost:8000
```

## Configuración (una sola vez)

1. Crear un fine-grained PAT (Settings → Developer settings → Personal access tokens → Fine-grained tokens): owner `ckomiya`, *All repositories*, permisos de repositorio **Metadata: Read**, **Contents: Read** y **Administration: Read** (este último es necesario para el tráfico).
2. Guardarlo en el repo: Settings → Secrets and variables → Actions → New repository secret → `GH_STATS_TOKEN`.
3. Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)`.
4. Actions → *Actualizar datos* → Run workflow.

Los fine-grained PAT vencen (máximo 1 año): hay que renovarlo y actualizar el secret.
