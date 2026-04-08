# UI Panel Orchestrator

Panel frontend para revisar arquitecturas, tareas y ejecuciones desde una interfaz simple.

## Stack

- Vite
- React 19
- TypeScript
- React Router
- Zustand
- TanStack Query

## Ejecutar

```bash
npm install
npm run dev
```

## App de escritorio (Electron)

El empaquetado de Electron arranca automáticamente:
- la UI compilada (`dist`)
- el `terminal-agent` embebido

Comandos:

```bash
# abrir app Electron local (compila antes)
npm run electron:start

# generar paquete local sin instalador (directorio unpacked)
npm run electron:pack

# generar instalador/artefactos del sistema operativo actual
npm run electron:dist
```

## Ejecutar terminal real desde el panel (MVP)

Para habilitar ejecucion de comandos en terminal desde la vista **Ejecuciones**:

### Arranque rapido (UI + agent en un comando)

```bash
./scripts/start-panel.sh /ruta/proyecto-a /ruta/proyecto-b
```

Sin argumentos, toma este repo como `cwd` permitido por defecto.

Variables opcionales del script:

- `PANEL_UI_PORT` (default `5173`)
- `PANEL_AGENT_PORT` (default `8787`)
- `PANEL_AGENT_TIMEOUT_MS` (default `600000`)
- `PANEL_COMMAND_ALLOWLIST` (prefijos permitidos para comandos)
- `PANEL_PROJECT_DIRS` (lista CSV de rutas permitidas si no pasas argumentos)
- `PANEL_PROJECTS_FILE` (archivo de persistencia de proyectos/favoritos)
- `PANEL_WORKSPACE_FILE_NAME` (nombre del archivo de trabajo que crea el panel en cada carpeta)

Ejemplo:

```bash
PANEL_COMMAND_ALLOWLIST="npm run lint,npm run build,npm run test,git status" \
./scripts/start-panel.sh /Users/tuuser/projA /Users/tuuser/projB
```

### Arranque manual (dos terminales)

1. Inicia la UI:

```bash
npm run dev
```

2. En otra terminal, inicia el agent local:

```bash
npm run terminal:agent
```

Por defecto escucha en `http://localhost:8787`.

### Variables opcionales del agent

- `TERMINAL_AGENT_PORT`: puerto del agent (default `8787`)
- `TERMINAL_AGENT_ALLOWLIST`: prefijos permitidos para comandos, separados por coma
- `TERMINAL_AGENT_ALLOWED_CWDS`: roots de `cwd` permitidos, separados por coma
- `TERMINAL_AGENT_RUN_TIMEOUT_MS`: timeout maximo por run (default `600000`)
- `TERMINAL_AGENT_PROJECTS_FILE`: archivo JSON para persistir proyectos y favoritos
- `TERMINAL_AGENT_WORKSPACE_FILE_NAME`: nombre del archivo de trabajo que crea el panel

Ejemplo:

```bash
TERMINAL_AGENT_ALLOWLIST="npm run lint,npm run build,git status" npm run terminal:agent
```

### Primer pantalla obligatoria

La primera pantalla ahora es **Proyectos recientes**.

- Debes elegir carpeta de trabajo para entrar al panel.
- Puedes pulsar **Elegir carpeta (Finder/Explorador)** para abrir selector nativo:
  - macOS: Finder
  - Windows: Explorador
  - Linux: selector de carpetas con `zenity` (si está instalado)
- Al seleccionar carpeta, el agent crea/actualiza el archivo:
  - `.panel-orquestador-workspace.json` (por defecto)
  - ruta: `<carpeta-elegida>/.panel-orquestador-workspace.json`
- La carpeta debe tener permisos de escritura (si no, el panel mostrará error al enlazar workspace).

### Usarlo en la UI

1. Entra a **Proyectos recientes**.
2. Elige una carpeta desde recientes, escribe una ruta, o usa **Elegir carpeta (Finder/Explorador)**.
3. Si lo necesitas, usa **Inicializar package.json** para previsualizar/editar el JSON antes de guardarlo.
4. Si no existe `package.json`, el panel bloquea el acceso al dashboard hasta crearlo.
5. Pulsa **Entrar** para abrir dashboard.
6. Ve a **Ejecuciones** para lanzar comandos.
7. Abre el inspector del run para ver logs en vivo y estado final.
8. Si ejecutas `npm/pnpm/yarn` y no existe `package.json`, el agent intentará crearlo automáticamente según la estructura detectada de la carpeta.
9. Usa **Piloto (beta)** en la pantalla inicial para guiar el flujo con comandos: elegir carpeta, crear package.json, consultar estado y ejecutar comandos.

## Qué verás

- Barra superior con navegación principal y selector de arquitectura
- Vista de inicio con métricas, arquitecturas y actividad reciente
- Vista de arquitecturas con tarjetas simples
- Vista de tareas con búsqueda y filtros
- Vista de ejecuciones con filtros por estado y alcance
- Inspector lateral bajo demanda

## Cómo usarlo

1. Elige una arquitectura desde la barra superior.
2. Usa Inicio para ver estado general y actividad reciente.
3. Entra en Arquitecturas para abrir el detalle de una arquitectura.
4. Usa Tareas para revisar trabajo pendiente del contexto activo.
5. Usa Ejecuciones para ver historial o actividad en curso.
6. Abre el inspector cuando necesites más detalle.

## Principios de la UI

- Menos carga cognitiva antes que más funciones.
- Una acción principal por pantalla cuando sea posible.
- Sin paneles permanentes que compitan por atención.
- Texto corto, claro y en español.
- Si algo no mejora la comprensión, no se añade.

## Objetivo funcional del panel

El panel debe ayudar a identificar rapidamente que arquitectura requiere atencion y abrir la accion correcta sin perder contexto.

## Criterio de exito

- En menos de 30 segundos, una persona debe poder:
	- detectar si la arquitectura activa necesita intervencion,
	- entender la causa principal (riesgo, bloqueo o ejecucion fallida),
	- abrir la accion correcta (inspeccionar, ver detalle, revisar tareas o ejecuciones).

## Guia practica por pantalla

### Inicio (Dashboard)

Accion principal:
- Detectar que requiere atencion ahora.

Debe mostrar primero:
- Estado de la arquitectura activa.
- Señal principal de prioridad (riesgo o bloqueo).
- Atajo directo a una accion concreta.

Evitar:
- Multiples bloques compitiendo por prioridad.
- Metrica duplicada en distintas tarjetas.

Checklist rapido:
- [ ] Se entiende que hay que hacer en menos de 5 segundos.
- [ ] Hay una accion principal visible.
- [ ] La actividad reciente solo aporta contexto util para decidir.

### Arquitecturas

Accion principal:
- Elegir una arquitectura para actuar.

Debe mostrar primero:
- Nombre, estado y una señal breve de prioridad.
- Transicion clara a detalle de arquitectura.

Evitar:
- Campos tecnicos sin impacto en decision.
- Tarjetas con demasiadas acciones secundarias.

Checklist rapido:
- [ ] La comparacion entre arquitecturas es inmediata.
- [ ] Se puede abrir detalle con un solo clic.

### Detalle de arquitectura

Accion principal:
- Entender por que esa arquitectura necesita atencion y actuar.

Debe mostrar primero:
- Causa principal actual (riesgo, bloqueo, ejecucion en fallo o cola).
- Tareas relevantes y ejecuciones recientes de la misma arquitectura.
- Acceso directo a inspeccionar.

Evitar:
- Poner todas las metricas al mismo nivel visual.
- Mezclar contexto operativo con ruido historico.

Checklist rapido:
- [ ] Queda clara la causa principal.
- [ ] La siguiente accion no requiere buscar en otra vista.

### Tareas

Accion principal:
- Identificar que bloquea el avance y asignar foco.

Debe mostrar primero:
- Bloqueadas y en progreso de la arquitectura activa.
- Filtro corto y opcional.
- Busqueda simple por titulo, dominio o responsable.

Evitar:
- Exceso de filtros simultaneos.
- Mostrar tareas resueltas al mismo nivel que bloqueos.

Checklist rapido:
- [ ] Bloqueadas visibles sin esfuerzo.
- [ ] En progreso separadas de pendientes.
- [ ] Estado vacio explica que falta o que hacer.

### Ejecuciones

Accion principal:
- Detectar ejecuciones que requieren seguimiento inmediato.

Debe mostrar primero:
- Alcance por defecto en arquitectura activa.
- Running, Queued y Failed priorizadas visualmente.
- Acceso claro al contexto de la ejecucion.

Evitar:
- Priorizar historico exitoso sobre incidencias activas.
- Etiquetas de estado ambiguas.

Checklist rapido:
- [ ] Lo urgente aparece arriba o destacado.
- [ ] El cambio entre "arquitectura activa" y "todas" es claro.

### Inspector lateral

Accion principal:
- Confirmar contexto y decidir la siguiente accion sin cambiar de pantalla.

Debe mostrar primero:
- Entidad origen (arquitectura, tarea o ejecucion).
- Resumen corto de estado.
- Una accion primaria.

Evitar:
- Convertirlo en vista paralela con demasiados bloques.
- Duplicar contenido completo de la pantalla principal.

Checklist rapido:
- [ ] Aporta decision, no ruido.
- [ ] Se puede cerrar sin perder el hilo de trabajo.

## Plan de ejecucion recomendado

1. Ajustar Inicio para que priorice una sola señal de atencion.
2. Alinear Detalle de arquitectura para que explique causa y accion.
3. Simplificar Tareas para destacar bloqueos y en progreso.
4. Ajustar Ejecuciones para foco operativo (activa por defecto).
5. Revisar Inspector para mantenerlo como apoyo y no como segunda pantalla.

## Regla de decision

Si una mejora no reduce tiempo de decision o pasos para actuar, no se implementa.

## JSON local

El panel ahora lee sus datos desde:

- [public/data/orchestrator-panel.json](/Volumes/Warehouse/AMTEC/ARQUITECTURA/PANEL_ORQUESTADOR/public/data/orchestrator-panel.json)

Si quieres cambiar arquitecturas, tareas, ejecuciones o actividad reciente, edita ese archivo y recarga el navegador.
