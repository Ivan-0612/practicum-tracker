# Flujo funcional

Este documento resume el comportamiento real del sistema de principio a fin.

## 1. Alta de alumno

1. La administración crea un pre-registro con correo.
2. El alumno entra en el flujo público de registro.
3. Completa datos personales, contraseña, curso, grupo, especialidad y centro.
4. El backend crea el alumno, la rotación inicial y las asignaciones de tutor.

## 2. Acceso

1. El usuario inicia sesión con su correo y contraseña.
2. Si es alumno y aún no ha completado el registro, el login se bloquea hasta finalizar el proceso.
3. El frontend redirige al dashboard según el rol.

### Recuperación de contraseña

Desde la pantalla de login, el enlace "¿Olvidaste tu contraseña?" cambia la tarjeta al modo de recuperación sin abandonar la página. El usuario introduce su email, el backend genera un token de 30 minutos y envía el enlace a `/restablecer-password?token=...`. Si el email no existe, la respuesta es siempre positiva para no revelar qué cuentas están registradas.

## 3. Rotaciones

1. La administración puede crear rotaciones manuales o automáticas.
2. El alumno puede solicitar una nueva rotación cuando termina la activa.
3. Los centros aportan tutores por defecto y el sistema asigna tutores a la rotación.

### Tutor de campo (flujo por enlace)

El tutor de campo es el enfermero del hospital, desconocido hasta el inicio de la rotación. El flujo evita que el alumno tenga que conocer ni introducir su correo:

1. El alumno pulsa "+ Añadir" en su rotación activa y genera un enlace único desde su dashboard.
2. El enlace contiene un token válido durante 7 días. Si se regenera, el anterior queda invalidado automáticamente.
3. El alumno comparte el enlace con el enfermero por cualquier medio (WhatsApp, correo, etc.).
4. El enfermero abre `/tutor-campo/registro?token=...` e introduce su email.
5. El backend comprueba si ese email ya tiene cuenta:
   - **Cuenta existente**: se muestra una pantalla de confirmación y queda asignado directamente.
   - **Cuenta nueva**: se le pide una contraseña, se crea la cuenta y queda asignado.
6. El token se marca como usado y no puede reutilizarse.
7. Los tutores de hospital y universidad reciben una notificación por email.

## 4. Asistencia

1. El profesor registra la asistencia sobre una fecha concreta.
2. El alumno puede consultar su historial.
3. Si una jornada fue recuperada, se conserva la fecha de recuperación.

## 5. Evaluación

1. El tutor accede al cuadernillo de la rotación.
2. La evaluación se rellena y se puede revisar antes del cierre definitivo.
3. El sistema conserva el evaluador real, genera avisos y permite exportar la información.

### Navegación por páginas (wizard)

Tanto la vista del tutor (`/profesor/evaluar/[id]`) como la del alumno (`/alumno/evaluar/[id]`) dividen el cuadernillo en páginas independientes en lugar de un scroll largo. Cada página corresponde a un bloque de la rúbrica: la primera muestra las Actividades Específicas (SÍ/NO) y las siguientes muestran una Unidad de Competencia por página. La navegación se controla con los botones Anterior/Siguiente y unos indicadores de punto clicables. La vista del alumno solo muestra la navegación cuando la evaluación está cerrada; mientras está en curso, muestra el bloque de calificaciones ocultas.

El botón de finalizar evaluación es visible en todas las páginas del wizard del tutor, no solo en la última.

## 6. Administración y exportación

1. El panel de administración ofrece estadísticas, listados y acciones masivas.
2. Se pueden exportar Excel de rotaciones o evaluaciones.
3. Los centros, tutores y plantillas globales se administran desde pantallas específicas.