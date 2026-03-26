# Instrucciones del panel orquestador

## Contexto del proyecto
- Este workspace contiene un panel UI para orquestación de arquitecturas, tareas y ejecuciones.
- La app está hecha con Vite + React + TypeScript.
- La fuente de datos local está en `public/data/orchestrator-panel.json`.

## Estado actual de la UI
- Navegación principal en una barra superior horizontal.
- Inspector como drawer lateral bajo demanda.
- Sin sidebar permanente ni bottom tray permanente.
- La experiencia debe priorizar claridad y baja carga cognitiva.

## Convenciones de edición
- Hacer cambios pequeños y enfocados.
- Mantener el estilo visual simple y consistente.
- No reintroducir paneles o elementos decorativos que aumenten ruido visual sin aportar uso claro.
- Cuando se cambie la estructura de datos, actualizar también tipos, hooks y páginas que dependan de ella.

## Archivos clave
- `src/app/store/ui-store.ts`: estado global del panel.
- `src/lib/query/hooks.ts`: lectura del JSON local.
- `src/lib/types.ts`: tipos de dominio.
- `src/components/layout/MainLayout.tsx`: shell principal.
- `src/components/layout/Topbar.tsx`: navegación y selector de arquitectura.
- `src/components/layout/InspectorDrawer.tsx`: panel lateral de inspección.
- `src/pages/*.tsx`: vistas principales.
- `src/index.css`: sistema visual.

## Flujo recomendado al cambiar la UI
1. Identificar el objetivo funcional.
2. Reducir primero la complejidad de interacción.
3. Ajustar tipos y datos si es necesario.
4. Validar con build y lint.

## Validación
- Ejecutar `npm run build` para comprobar compilación.
- Ejecutar `npm run lint` para revisar calidad del código.

## Comunicación
- Responder en español.
- Ser directo, concreto y orientado a acción.
- Si faltan datos reales, usar placeholders claros y fáciles de reemplazar.
