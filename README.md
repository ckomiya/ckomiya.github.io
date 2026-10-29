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
- **Historial y récords**: el script guarda en `data/cache.json` (no lo lee la página) el estado incremental de mis commits por repo: contadores diarios/por hora, cursor de la última sincronización y commits pendientes de medir. Cada día solo pide commits nuevos.
- **Tamaño de commits**: 1 petición por commit, con tope de 1200 por ejecución y reserva de 800 peticiones del límite horario; lo pendiente se completa en días siguientes. Excluye merges y archivos generados (lockfiles, `data/*.json`, CSV, notebooks, `dist/`, `node_modules/`…).
- **Líneas agregadas/eliminadas**: `stats/code_frequency` (cuenta a todos los autores y no distingue archivos generados). Si responde 202 reintenta con espera; si no llega, conserva el dato anterior del repo.
- **Estado de proyecto**: `activo` = commit en los últimos 30 días, `pausado` = sin commits recientes, `archivado` = repo archivado.
- **Privacidad**: de los repos privados solo se guarda un número agregado (commits del año). Ningún nombre, descripción ni mensaje llega al JSON.
  El total se cuenta por REST (mis commits en la rama por defecto de mis repos privados desde el 1 de enero), porque GraphQL omite lo privado si el perfil no tiene activada la opción *Include private contributions*.
- Tema oscuro por defecto; el botón cambia a claro y la elección se guarda en `localStorage`.
- `assets/`: avatar (cabecera), favicon y la imagen Open Graph.
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
