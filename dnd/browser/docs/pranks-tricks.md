# Bromas y jugarretas

Las 19 bromas del Payaso y las 34 jugarretas del Canalla aparecen en **Other Options and Features**, con los tipos **Broma** (`BRM`) y **Jugarreta** (`JUG`), fuente Himo. Se pueden buscar individualmente, filtrar por tipo y nivel, y consultar mediante enlaces o ventanas emergentes.

Se sigue el modelo de Battle Master elegido para estas opciones: **las reglas están tanto en la clase como en `data/optionalfeatures.json`**. Para cambiar una regla, actualiza ambas copias y ejecuta `node test/pranks-tricks-data.test.js` desde `dnd/browser`. La prueba compara los textos y avisa si divergen. No existe un generador periódico que sobrescriba cambios manuales.

- En `data/class/class-clown.json` permanecen las bromas generales de niveles 2, 5 y 11 y las dos bromas de cada Circo a nivel 3. Las fichas individuales incluyen el uso general de las bromas; las de los Circos conservan que están preparadas y no cuentan para el máximo.
- En `data/class/class-canalla.json` permanecen las jugarretas generales de niveles 2 y 9 y una jugarreta de cada Experiencia a niveles 3, 6, 11 y 15. Los beneficios adicionales de los rasgos de subclase no se convierten en jugarretas.
- Los requisitos utilizan `prerequisite.level`, con nivel de clase, clase y, cuando corresponda, subclase. No son niveles independientes de subclase.
- Las clases incluyen enlaces a sus respectivas listas filtradas. El indexador compartido registra cada ficha en una sola categoría: Broma (46) o Jugarreta (47).

Archivos de integración: `js/utils.js` registra nombres y categorías; `js/optionalfeatures.js` utiliza los filtros existentes; `js/omnidexer.js` registra las entradas de búsqueda y `search/index.json` contiene las entradas publicadas. No se añaden dependencias ni configuración de Inspector.

El lector compartido de requisitos, en `js/render.js`, muestra también la subclase cuando el requisito declara `visible: true`. Así, las fichas identifican el Circo o la Experiencia correspondiente.

## Verificación de la entrega

Se crearon esta guía y `test/pranks-tricks-data.test.js`. Se actualizaron los datos de opciones, los enlaces de Payaso y Canalla, los registros de tipos y búsqueda, el lector de requisitos y la comprobación de etiquetas de palabras de poder.

La prueba nueva verifica las 53 opciones contra las descripciones originales, incluidos requisitos, contexto, renderizado e índices. La batería completa da 17 pruebas correctas de 20. Los fallos ajenos a esta tarea corresponden a `class-alchemist-data`, `class-planeswalker-data` y `reference-linking-status`; este último detecta referencias de conjuros en Planeswalker y cadenas pendientes de normalización en el catálogo existente. Las opciones nuevas no añaden referencias sin resolver.

En navegador se comprobaron los enlaces desde ambas clases (19 bromas y 34 jugarretas), las fichas de Shock y Brochazo, el requisito de Vándalo, la ventana emergente y el resultado global «Jugarreta: Brochazo». Consola sin errores ni avisos en estas comprobaciones.

No queda un script de importación o regeneración automática. Para una ampliación futura, añade la opción en ambos lugares y actualiza los totales esperados de la prueba.
