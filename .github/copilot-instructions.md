# Instrucciones de implementación para GitHub Copilot

## Objetivo del repositorio

Este repositorio **no debe rediseñarse desde cero**. Ya existe una base sólida de panel y control-plane en React.

La meta es convertir `MarcValls/PANEL_ORQUESTADOR` en un **orquestador multiagente con núcleo operativo mínimo**, manteniendo la UI actual y sustituyendo progresivamente la fuente estática `public/data/orchestrator-panel.json` por un runtime interno con stores, eventos, políticas, tools y proyecciones.

## Base actual verificada en el repositorio

- `src/App.tsx` define rutas para `dashboard`, `architectures`, `tasks`, `runs` y `settings`.
- `src/components/layout/MainLayout.tsx` monta `Topbar`, `Outlet` e `InspectorDrawer`.
- `src/app/store/ui-store.ts` persiste el estado de UI con Zustand.
- `src/lib/query/hooks.ts` carga datos desde `public/data/orchestrator-panel.json` mediante React Query.
- `src/lib/types.ts` contiene tipos de panel para `Architecture`, `Task`, `Run` y `OrchestratorPanelData`.
- `src/pages/DashboardPage.tsx`, `src/pages/ArchitectureOverviewPage.tsx`, `src/pages/TasksPage.tsx`, `src/pages/RunsPage.tsx` y `src/pages/SettingsPage.tsx` ya resuelven correctamente la capa de presentación.

## Regla principal

**No romper la UI existente.**

Primero crear el dominio y el runtime. Después reconectar `src/lib/query/hooks.ts` a las nuevas proyecciones. La UI actual debe seguir funcionando durante la migración.

## Restricciones obligatorias

1. Todos los archivos nuevos deben guardarse en **UTF-8**.
2. En cualquier comando o fragmento de código, **no usar `...`** para abreviar rutas, imports, argumentos o estructuras. Escribir rutas completas y exactas.
3. Mantener TypeScript estricto y código legible.
4. Priorizar funciones pequeñas, tipadas y con nombres claros.
5. No introducir dependencias nuevas salvo necesidad real.
6. No eliminar la capa actual de páginas y layout.
7. No migrar a backend externo en la primera iteración. Empezar con stores en memoria y proyecciones internas.

## Resultado esperado de la primera iteración

La primera iteración debe transformar el panel de estático a **runtime mínimo observable**, demostrando estas cinco condiciones:

1. Crear un `run` sin editar `public/data/orchestrator-panel.json`.
2. Registrar un evento `RUN_CREATED` en un event store interno.
3. Mostrar ese `run` en `src/pages/RunsPage.tsx`.
4. Mostrar actividad derivada del event store en `src/pages/DashboardPage.tsx`.
5. Bloquear o marcar como `requires approval` una ejecución `High risk` en `production`.

## Árbol objetivo de carpetas

Crear estas carpetas y archivos, respetando exactamente estas rutas:

```text
/src/domain
/src/domain/agents
/src/domain/agents/types.ts
/src/domain/agents/registry.ts
/src/domain/agents/selectors.ts
/src/domain/tasks
/src/domain/tasks/types.ts
/src/domain/tasks/task-service.ts
/src/domain/runs
/src/domain/runs/types.ts
/src/domain/runs/run-engine.ts
/src/domain/runs/run-store.ts
/src/domain/runs/run-selectors.ts
/src/domain/routing
/src/domain/routing/route-task.ts
/src/domain/routing/handoff-policy.ts
/src/domain/tools
/src/domain/tools/types.ts
/src/domain/tools/registry.ts
/src/domain/tools/execute-tool-call.ts
/src/domain/policies
/src/domain/policies/types.ts
/src/domain/policies/policy-engine.ts
/src/domain/policies/risk-policy.ts
/src/domain/policies/environment-policy.ts
/src/domain/policies/approval-policy.ts
/src/domain/events
/src/domain/events/types.ts
/src/domain/events/event-bus.ts
/src/domain/events/event-store.ts
/src/domain/projections
/src/domain/projections/architectures-projection.ts
/src/domain/projections/tasks-projection.ts
/src/domain/projections/runs-projection.ts
/src/domain/projections/activity-projection.ts
/src/infrastructure
/src/infrastructure/persistence
/src/infrastructure/persistence/in-memory-db.ts
/src/infrastructure/tools
/src/infrastructure/tools/local-read-tool.ts
/src/infrastructure/tools/local-write-tool.ts
/src/infrastructure/tools/local-log-tool.ts
/src/infrastructure/clock
/src/infrastructure/clock/now.ts
/src/infrastructure/ids
/src/infrastructure/ids/create-id.ts
/src/mappers
/src/mappers/panel-view-models.ts
