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

## 3. Rotaciones

1. La administración puede crear rotaciones manuales o automáticas.
2. El alumno puede solicitar una nueva rotación cuando termina la activa.
3. Los centros aportan tutores por defecto y el sistema asigna tutores a la rotación.

## 4. Asistencia

1. El profesor registra la asistencia sobre una fecha concreta.
2. El alumno puede consultar su historial.
3. Si una jornada fue recuperada, se conserva la fecha de recuperación.

## 5. Evaluación

1. El tutor accede al cuadernillo de la rotación.
2. La evaluación se rellena y se puede revisar antes del cierre definitivo.
3. El sistema conserva el evaluador real, genera avisos y permite exportar la información.

## 6. Administración y exportación

1. El panel de administración ofrece estadísticas, listados y acciones masivas.
2. Se pueden exportar Excel de rotaciones o evaluaciones.
3. Los centros, tutores y plantillas globales se administran desde pantallas específicas.