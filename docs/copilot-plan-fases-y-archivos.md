# Plan para GitHub Copilot por archivos y fases

## Propósito

Este documento guía a GitHub Copilot para continuar la evolución de `MarcValls/PANEL_ORQUESTADOR` sin romper la UI actual.

El repositorio ya dispone de:

- una capa de presentación funcional en React,
- rutas y layout estables,
- un panel de datos basado en `public/data/orchestrator-panel.json`,
- un runtime parcial para `runs` y `activity` basado en Zustand,
- un `policyEngine` básico,
- un `eventStore` y proyecciones mínimas.

La prioridad es convertir el sistema híbrido actual en un orquestador con runtime más coherente, manteniendo la UX y sustituyendo gradualmente el JSON local como fuente de verdad.

## Regla general para Copilot

Antes de modificar una página o componente visual:

1. crear o refinar tipos de dominio,
2. crear o refinar stores, servicios o engine,
3. crear selectores o proyecciones,
4. y solo después reconectar hooks o UI.

No saltar directamente a reescribir páginas.

## Restricciones obligatorias

1. Todos los archivos nuevos deben guardarse en UTF-8.
2. No usar `...` para abreviar rutas, imports, argumentos o estructuras.
3. Mantener TypeScript estricto.
4. No rediseñar la UI existente.
5. No introducir backend externo en estas fases.
6. Priorizar refactors incrementales y verificables.

## Estado actual que Copilot debe asumir

### Ya existentes y funcionales

- `src/App.tsx`
- `src/components/layout/MainLayout.tsx`
- `src/components/layout/Topbar.tsx`
- `src/components/layout/InspectorDrawer.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/ArchitecturesPage.tsx`
- `src/pages/ArchitectureOverviewPage.tsx`
- `src/pages/TasksPage.tsx`
- `src/pages/RunsPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/app/store/ui-store.ts`
- `src/lib/query/hooks.ts`
- `src/lib/types.ts`
- `src/domain/runs/run-store.ts`
- `src/domain/runs/run-engine.ts`
- `src/domain/projections/runs-projection.ts`
- `src/domain/projections/activity-projection.ts`
- `src/domain/events/event-store.ts`
- `src/domain/events/event-bus.ts`
- `src/domain/policies/policy-engine.ts`
- `src/domain/policies/risk-policy.ts`
- `src/domain/policies/environment-policy.ts`
- `src/domain/policies/approval-policy.ts`
- `src/domain/agents/registry.ts`
- `src/domain/tools/registry.ts`
- `src/infrastructure/tools/local-read-tool.ts`
- `src/infrastructure/tools/local-write-tool.ts`
- `src/infrastructure/tools/local-log-tool.ts`

### Inconsistencias actuales que deben resolverse

1. `src/lib/query/hooks.ts` sigue mezclando datos del JSON local con runtime.
2. `src/pages/SettingsPage.tsx` todavía presenta el JSON como única fuente de datos.
3. `src/domain/runs/types.ts` sigue demasiado cerca del modelo visual del panel.
4. `src/domain/events/types.ts` usa `payload: Record<string, unknown>` y eso reduce el valor del tipado.
5. `src/domain/tools` existe, pero no está integrado de forma real en el flujo del `run-engine`.
6. El `policyEngine` decide aprobación, pero no modela rechazos ni bloqueos duros más expresivos.

## Objetivo de las próximas fases

Pasar de:

- panel estático con overlay de runtime,

hacia:

- runtime tipado,
- eventos más expresivos,
- políticas más claras,
- hooks conectados a proyecciones coherentes,
- páginas que muestren estado real del runtime.

---

# Fase 1 — Consolidar dominio de runs

## Objetivo

Separar el modelo de ejecución del modelo visual del panel.

## Archivos a modificar

- `src/domain/runs/types.ts`
- `src/domain/runs/run-store.ts`
- `src/domain/runs/run-engine.ts`
- `src/domain/projections/runs-projection.ts`
- `src/lib/types.ts`

## Instrucciones para Copilot

### 1. Refactorizar `src/domain/runs/types.ts`

Mantener compatibilidad con la UI actual, pero introducir un modelo más expresivo.

Añadir:

- un estado interno del runtime independiente del estado visual,
- estructura para tool calls,
- estructura para metadata operativa,
- campo para approval state.

Ejemplo orientativo:

```ts
export type RuntimeRunStatus =
  | 'queued'
  | 'planning'
  | 'waiting_approval'
  | 'executing'
  | 'blocked'
  | 'retrying'
  | 'succeeded'
  | 'failed'
  | 'cancelled'

export type RuntimeApprovalState = 'not_required' | 'required' | 'approved' | 'rejected'

export type RuntimeToolCall = {
  id: string
  toolName: string
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'blocked'
  startedAt?: string
  finishedAt?: string
  inputSummary?: string
  outputSummary?: string
  error?: string
}

export type DomainRun = {
  id: string
  architectureId: string
  title: string
  runtimeStatus: RuntimeRunStatus
  approvalState: RuntimeApprovalState
  startedAt: string
  finishedAt?: string
  duration: string
  node: string
  initiatedBy: string
  riskLevel: 'Low' | 'Medium' | 'High'
  environment: 'sandbox' | 'staging' | 'production'
  toolCalls: RuntimeToolCall[]
  errors: string[]
}
```

### 2. Ajustar `src/domain/runs/run-store.ts`

Añadir operaciones para:

- `addRun`
- `updateRun`
- `getRunById`
- `clearRuns`
- `replaceRuns`

Mantener Zustand y no introducir persistencia externa todavía.

### 3. Ajustar `src/domain/runs/run-engine.ts`

Separar claramente:

- construcción del run,
- evaluación de políticas,
- inserción en store,
- emisión de eventos.

Crear funciones auxiliares privadas para mejorar legibilidad.

### 4. Ajustar `src/domain/projections/runs-projection.ts`

La proyección debe traducir el dominio a `Run` de `src/lib/types.ts`.

Mapeo recomendado:

- `queued` -> `Queued`
- `executing` -> `Running`
- `waiting_approval` -> `Requires approval`
- `succeeded` -> `Succeeded`
- `failed` -> `Failed`
- `blocked` -> `Failed`

### 5. No rehacer todavía `src/pages/RunsPage.tsx`

Solo tocarla si es imprescindible para compilar.

## Criterio de éxito de Fase 1

- el runtime de runs tiene un modelo interno más rico,
- la UI sigue compilando,
- `RunsPage` sigue mostrando runs creados desde el runtime.

---

# Fase 2 — Tipar mejor los eventos

## Objetivo

Dejar de depender de `payload: Record<string, unknown>`.

## Archivos a modificar

- `src/domain/events/types.ts`
- `src/domain/events/event-store.ts`
- `src/domain/events/event-bus.ts`
- `src/domain/projections/activity-projection.ts`
- `src/domain/runs/run-engine.ts`

## Instrucciones para Copilot

### 1. Refactorizar `src/domain/events/types.ts`

Definir una unión discriminada por tipo de evento.

Ejemplo orientativo:

```ts
export type DomainEvent =
  | {
      id: string
      type: 'RUN_CREATED'
      occurredAt: string
      payload: {
        runId: string
        title: string
        architectureId: string
        runtimeStatus: string
        riskLevel: 'Low' | 'Medium' | 'High'
        environment: 'sandbox' | 'staging' | 'production'
      }
    }
  | {
      id: string
      type: 'APPROVAL_REQUIRED'
      occurredAt: string
      payload: {
        runId: string
        title: string
        reason: string
      }
    }
  | {
      id: string
      type: 'RUN_FAILED'
      occurredAt: string
      payload: {
        runId: string
        title: string
        error: string
      }
    }
  | {
      id: string
      type: 'RUN_SUCCEEDED'
      occurredAt: string
      payload: {
        runId: string
        title: string
      }
    }
```

### 2. Ajustar `activity-projection`

Eliminar `as` innecesarios y aprovechar narrowing por `event.type`.

### 3. Ajustar `run-engine`

Emitir payloads compatibles con el nuevo tipo discriminado.

## Criterio de éxito de Fase 2

- los eventos compilan sin casts frágiles,
- la proyección de actividad usa narrowing real,
- el runtime sigue mostrando actividad nueva en `DashboardPage`.

---

# Fase 3 — Endurecer políticas

## Objetivo

Que el `policyEngine` sea más expresivo y menos cosmético.

## Archivos a modificar

- `src/domain/policies/types.ts`
- `src/domain/policies/policy-engine.ts`
- `src/domain/policies/risk-policy.ts`
- `src/domain/policies/environment-policy.ts`
- `src/domain/policies/approval-policy.ts`
- `src/domain/runs/run-engine.ts`

## Instrucciones para Copilot

### 1. Refactorizar `src/domain/policies/types.ts`

Pasar a un resultado más semántico.

Ejemplo:

```ts
export type PolicyDecision =
  | { kind: 'allow' }
  | { kind: 'require_approval'; reason: string }
  | { kind: 'block'; reason: string }
```

### 2. Hacer que cada policy devuelva `PolicyDecision`

No devolver solo booleanos sueltos.

### 3. Hacer que `policyEngine` combine decisiones

Regla recomendada:

- si una policy bloquea, el resultado final bloquea,
- si ninguna bloquea pero alguna requiere aprobación, el resultado final requiere aprobación,
- en otro caso, permitir.

### 4. Ajustar `run-engine`

Mapear decisiones a estado interno:

- `allow` -> `queued`
- `require_approval` -> `waiting_approval`
- `block` -> `blocked`

Además, emitir evento específico para bloqueos si introduces `RUN_BLOCKED`.

## Criterio de éxito de Fase 3

- el motor de políticas puede distinguir permitir, bloquear y requerir aprobación,
- `RunsPage` refleja correctamente `Requires approval` o `Failed` según la proyección.

---

# Fase 4 — Integrar tools en el ciclo de ejecución

## Objetivo

Que `src/domain/tools` deje de ser una isla y entre en el flujo del runtime.

## Archivos a modificar

- `src/domain/tools/types.ts`
- `src/domain/tools/registry.ts`
- `src/domain/runs/run-engine.ts`
- `src/domain/agents/registry.ts`
- `src/domain/events/types.ts`
- `src/domain/projections/activity-projection.ts`

## Archivos a revisar

- `src/infrastructure/tools/local-read-tool.ts`
- `src/infrastructure/tools/local-write-tool.ts`
- `src/infrastructure/tools/local-log-tool.ts`

## Instrucciones para Copilot

### 1. Refinar `src/domain/tools/types.ts`

Añadir contratos más ricos:

- contexto de ejecución,
- validación de input,
- mutabilidad,
- resultado homogéneo.

### 2. Introducir una función de ejecución central

Crear un archivo nuevo:

- `src/domain/tools/execute-tool-call.ts`

Esta función debe:

- localizar la tool,
- validar que existe,
- opcionalmente validar permisos del agente,
- ejecutar,
- devolver resultado tipado,
- emitir eventos si corresponde.

### 3. Conectar `run-engine` con una tool simple

No hace falta un loop agentic completo todavía.

Basta con que `run-engine` sea capaz de:

- registrar una tool call,
- ejecutar `local_log` o `local_read`,
- actualizar el run con el resultado,
- emitir `TOOL_CALL_STARTED` y `TOOL_CALL_FINISHED`.

### 4. Verificar coherencia de nombres de tools

Normalizar el naming entre:

- `toolNames` en agentes,
- `name` de cada tool,
- event payloads.

## Criterio de éxito de Fase 4

- existe al menos una tool integrada en el flujo del runtime,
- los runs pueden registrar tool calls,
- la actividad puede reflejar inicio y fin de tool calls.

---

# Fase 5 — Limpiar la fuente de verdad en hooks

## Objetivo

Reducir el acoplamiento al JSON local en `runs` y `activity`, dejando claro qué sigue siendo snapshot y qué ya es runtime.

## Archivos a modificar

- `src/lib/query/hooks.ts`
- `src/domain/projections/runs-projection.ts`
- `src/domain/projections/activity-projection.ts`
- `src/pages/SettingsPage.tsx`

## Instrucciones para Copilot

### 1. Refactorizar `src/lib/query/hooks.ts`

Mantener por ahora:

- `architectures` desde JSON,
- `tasks` desde JSON.

Pero para:

- `runs`
- `activity`

hacer explícito que la fuente es híbrida o preparar el paso para que el runtime tenga prioridad clara.

### 2. Actualizar `SettingsPage`

Dejar de afirmar que el JSON es la única fuente de datos.

Mostrar algo como:

- Arquitecturas: snapshot local
- Tasks: snapshot local
- Runs: snapshot local + runtime en memoria
- Activity: snapshot local + eventos runtime

### 3. No tocar todavía `ArchitecturesPage` ni `TasksPage` más de lo necesario.

## Criterio de éxito de Fase 5

- la app comunica correctamente su arquitectura híbrida,
- `SettingsPage` deja de ser engañosa,
- el runtime se entiende mejor desde la propia UI.

---

# Fase 6 — Mejorar registry de agentes

## Objetivo

Pasar de un catálogo simple de agentes a una base más útil para orquestación.

## Archivos a modificar

- `src/domain/agents/types.ts`
- `src/domain/agents/registry.ts`
- `src/domain/runs/run-engine.ts`
- `src/domain/policies/policy-engine.ts`

## Instrucciones para Copilot

### 1. Refinar `src/domain/agents/types.ts`

Añadir campos como:

- `domains`
- `allowedTools`
- `environments`
- `maxRisk`

### 2. Ajustar `registry.ts`

Usar esos campos para definir mejor cada agente.

### 3. Empezar a usar registry en `run-engine`

Validar al menos:

- que el agente existe,
- que el entorno es compatible,
- que el riesgo no excede lo permitido.

## Criterio de éxito de Fase 6

- el agent registry deja de ser solo informativo,
- empieza a participar en decisiones del runtime.

---

# Fase 7 — Preparar salto futuro a runtime predominante

## Objetivo

Dejar el repo listo para que, en una iteración posterior, arquitecturas y tasks también salgan del runtime o de un store unificado.

## Archivos a revisar

- `src/lib/query/hooks.ts`
- `src/lib/types.ts`
- `src/domain/projections/tasks-projection.ts`
- `src/domain/projections/architectures-projection.ts`
- `src/pages/SettingsPage.tsx`

## Instrucciones para Copilot

### 1. Crear si no existen

- `src/domain/projections/tasks-projection.ts`
- `src/domain/projections/architectures-projection.ts`

Aunque al principio solo adapten snapshot local a un formato más coherente.

### 2. Preparar la separación entre

- datos de snapshot,
- datos de runtime,
- view models de panel.

### 3. No migrar todavía todo a runtime si la app se complica demasiado.

El objetivo aquí es dejar la estructura lista, no completar toda la transición.

## Criterio de éxito de Fase 7

- existe una dirección clara para desacoplar el panel del JSON,
- la capa de proyecciones está mejor preparada para crecer.

---

# Orden recomendado de trabajo para Copilot

1. Fase 1
2. Fase 2
3. Fase 3
4. Fase 4
5. Fase 5
6. Fase 6
7. Fase 7

No invertir este orden.

---

# Prompt sugerido para Copilot — Fase 1

```text
Implementa únicamente la Fase 1 del archivo `docs/copilot-plan-fases-y-archivos.md`.

Condiciones:
- No modifiques `src/pages/DashboardPage.tsx`, `src/pages/ArchitectureOverviewPage.tsx`, `src/pages/TasksPage.tsx`, `src/pages/ArchitecturesPage.tsx` ni `src/components/layout/MainLayout.tsx` salvo que sea imprescindible para compilar.
- Mantén la UI actual.
- No uses `...` en rutas, imports, argumentos o estructuras.
- Guarda todos los archivos en UTF-8.
- Resume al final qué archivos has modificado y qué compatibilidad has preservado con la UI actual.
```

# Prompt sugerido para Copilot — Fase 2

```text
Implementa únicamente la Fase 2 del archivo `docs/copilot-plan-fases-y-archivos.md`.

Condiciones:
- Usa uniones discriminadas en `src/domain/events/types.ts`.
- Elimina casts frágiles en `src/domain/projections/activity-projection.ts` siempre que sea posible.
- No rediseñes páginas.
- No uses `...` para abreviar rutas ni código.
- Resume al final qué eventos has tipado y qué código del runtime has ajustado.
```

# Prompt sugerido para Copilot — Fase 3

```text
Implementa únicamente la Fase 3 del archivo `docs/copilot-plan-fases-y-archivos.md`.

Condiciones:
- El `policyEngine` debe distinguir entre permitir, requerir aprobación y bloquear.
- Ajusta `src/domain/runs/run-engine.ts` para mapear correctamente esas decisiones al estado interno del run.
- Mantén compatibilidad con la UI actual a través de proyecciones.
- No uses `...`.
- Resume al final qué decisiones puede tomar ahora el motor de políticas.
```

# Prompt sugerido para Copilot — Fase 4

```text
Implementa únicamente la Fase 4 del archivo `docs/copilot-plan-fases-y-archivos.md`.

Condiciones:
- Integra al menos una tool real en el flujo del runtime.
- Crea `src/domain/tools/execute-tool-call.ts`.
- Emite eventos de inicio y fin de tool call.
- No rediseñes páginas.
- No uses `...`.
- Resume al final qué tool has integrado, cómo se ejecuta y qué eventos produce.
```

# Prompt sugerido para Copilot — Fase 5

```text
Implementa únicamente la Fase 5 del archivo `docs/copilot-plan-fases-y-archivos.md`.

Condiciones:
- Aclara en `src/pages/SettingsPage.tsx` la naturaleza híbrida de las fuentes de datos.
- No cambies la UX principal del panel.
- Mantén `architectures` y `tasks` sobre snapshot local por ahora.
- No uses `...`.
- Resume al final qué fuentes de datos usa ahora cada sección del panel.
```

# Definición de éxito global

La evolución va bien si al terminar estas fases se puede demostrar que:

1. `RunsPage` sigue permitiendo crear ejecuciones.
2. `DashboardPage` sigue mostrando actividad reciente.
3. El runtime tiene un modelo de run más expresivo que el actual.
4. El event model es más seguro a nivel de tipos.
5. El motor de políticas diferencia aprobación y bloqueo.
6. Al menos una tool participa en el ciclo real de ejecución.
7. La app explica correctamente que aún conviven snapshot local y runtime.

## Instrucción final para Copilot

Trabaja de forma incremental. No rehagas el panel. No ataques demasiadas fases a la vez. La prioridad es fortalecer el runtime y las proyecciones sin romper la experiencia actual del panel.
