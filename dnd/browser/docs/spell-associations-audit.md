# Asociaciones de conjuros: mantenimiento y migración

## Una fuente por relación

| Qué quieres cambiar | Dónde editar |
|---|---|
| Clases normales | La entrada del conjuro: classes.fromClassList |
| Clases opcionales | La entrada del conjuro: classes.fromClassListVariant |
| Acceso por subclase | additionalSpells en la subclase, dentro de data/class/class-*.json |
| Acceso por raza o subraza | additionalSpells en su definición, dentro de data/races.json |
| Acceso por trasfondo | additionalSpells en su definición, dentro de data/backgrounds.json |

Por ejemplo, Payaso y Planeswalker de Dispel Magic se editan en data/spells/spells-phb.json. Dimir Operative y su acceso a Encode Thoughts se editan en backgrounds.json. Los conjuros de los Circos se editan en las subclases de class-clown.json. No hay que consultar las subclases para cambiar las clases normales de un conjuro.

Los conjuros nuevos necesitan sus clases explícitas. Ser de Mago no añade Planeswalker ni otras clases. Las tablas de reglas explican el contenido, pero no se interpretan como otra fuente de asignaciones.

## Formato de las listas

Se reutiliza additionalSpells. Una lista que solo indica acceso puede escribirse como {"name":"Catalog access","expanded":{"s0":["Fire Bolt|PHB"],"s3":["Dispel Magic|PHB"]}}. En estos bloques s0/s3 indican el nivel del conjuro. Cada referencia contiene nombre y fuente.

Conserva los modos prepared, known, innate y expanded existentes: no son equivalentes. Por ejemplo, {"prepared":{"3":["Hex|PHB"]}} conserva un acceso a partir de nivel 3 del personaje; no debe convertirse en una concesión gratuita. Conserva también habilidad, frecuencia, número de elecciones y demás condiciones. Para especializaciones se usa subSubclass en el bloque. Los selectores generales del catálogo se han convertido en listas explícitas; añadir un conjuro nuevo exige actualizar las listas que deban incluirlo.

Algunos bloques contienen association para conservar la identidad y los metadatos históricos de una relación (por ejemplo ERLW o SCAG). No cambies esa fuente por una reedición. otherSources permite enlazar una impresión disponible, indicando la fuente original y la impresión de destino; no cambia la pertenencia ni los filtros.

## Lector compartido y editor

DataUtil.spell, en js/utils.js, carga las entidades una vez, interpreta las listas y construye un índice inverso solo en memoria. getAssociationIndex interpreta las relaciones; pInitAssociations carga y mantiene la caché; getCopyWithAssociations devuelve copias enriquecidas. Las listas, filtros, selectores, fichas, ventanas emergentes e impresión consumen el formato existente. Las relaciones de entidades nunca añaden clases normales al catálogo.

El editor carga el conjuro original mediante isRaw y explica en Sources que las relaciones derivadas del catálogo no se exportan a la copia personal. Las asociaciones explícitas de homebrew siguen siendo editables. Un adaptador dentro del mismo compilador admite classSpells, subclassSpells, subSubclassSpells y filtros personales; la caché se invalida al cambiar el homebrew. Nada escribe en los JSON durante el uso de la web.

## Inventario y correcciones

Se capturaron 724 conjuros antes de convertirlos. Se retiraron fromSubclass, races y backgrounds de sus entradas y se trasladaron a sus propietarios. El [registro completo](spell-association-migration.json) recoge cada alta y baja con identidad completa, motivo y procedencia. Es una auditoría histórica: no se carga en ejecución ni es una configuración editable.

| Relaciones únicas | Antes | Después |
|---|---:|---:|
| Subclases | 2704 | 3519 |
| Razas/subrazas | 338 | 380 |
| Trasfondos | 135 | 180 |

Se completaron las listas oficiales y se corrigieron las referencias abreviadas nombre|fuente. Cada Circo tiene ahora los diez conjuros de su lista. Vía Luz utiliza See Invisibility y Commune conforme a su tabla, retirando Prayer of Healing y Greater Restoration. Se normalizaron nombres cortos y completos, el alias local de Distort Value y la fuente de Juramento Salvaje sin crear fichas duplicadas.

Se incorporaron fichas completas de Aberrant Mind, Clockwork Soul, Fathomless, Chronurgy, Fey Wanderer, Kobold MPMM y Artificer (Revisited), con Alchemist, Archivist, Artillerist y Battle Smith. Los rasgos referenciados se adaptaron al formato local, agrupados por nivel, incluyendo las opciones necesarias. Fey Wanderer también aparece en Ranger Himo por su mecanismo ya existente de reutilización de subclases.

Fuentes fijadas: [5etools 2014, revisión 5dbd6bc](https://github.com/5etools-mirror-3/5etools-2014-src/tree/5dbd6bcfcba6a1295c3eac08549986290af909cb/data) y [Unearthed Arcana, revisión 2b69467](https://github.com/TheGiddyLimit/unearthed-arcana/tree/2b69467cd0220017de01eebc6d5bbc344ab7a0e3). No se importaron reglas de 2024 ni manuales completos.

Durante la revisión hubo dos cambios paralelos conservados: el índice dejó de publicar los cuatro conjuros de SCAG (720 cargados actualmente) y Dispel Magic recibió Lexarca directamente en su entrada. La auditoría registra esta única diferencia de clases respecto de la captura inicial; el lector no añade ni elimina ninguna clase normal u opcional.

## Archivos y verificación

- Creado data/class/class-artificer-revisited.json y el registro docs/spell-association-migration.json.
- Modificados los archivos de datos enumerados en modifiedDataFiles del registro, el índice de clases y las entradas correspondientes del índice de búsqueda. Las listas de los conjuros se trasladan a clases, razas y trasfondos; optionalfeatures contiene las dependencias UA necesarias.
- Refactorizados js/utils.js, js/render.js, js/render-spells.js, js/filter-spells.js, js/spells.js y js/makebrew-spell.js para compartir la resolución y evitar persistir datos derivados.
- Actualizadas las pruebas de asociaciones, catálogo y clases afectadas. No quedan generadores periódicos que sobrescriban ediciones manuales.
- Node verifica carga completa, igualdad de clases normales/opcionales entre original y copia enriquecida, inmutabilidad al filtrar/renderizar, altas/bajas de entidades, condiciones, especializaciones, deduplicación y homebrew explícito/heredado/con filtros.
- Última batería: 16 pruebas correctas de 18. Fallan dos comprobaciones ajenas a esta migración: class-alchemist-data espera «Especialización» donde los datos actuales dicen «Invocación Débil»; reference-linking-status detecta dos cadenas pendientes de normalización («medicina» e «invisible»), con cero referencias únicas sin resolver.
- Navegador: comprobadas Dispel Magic, la ficha completa de Clockwork Soul y el enlace desde Mind Sliver a la ficha completa de Kobold MPMM. La carga limpia no registra errores de consola. El editor abre su selección de fuente personal; la separación entre carga original para editar y carga enriquecida para ventanas emergentes se verifica automáticamente. No se ha importado un archivo personal mediante la interfaz: su compatibilidad se comprueba en Node.

Sin dependencias nuevas ni configuración de Inspector. Mejora futura opcional: mostrar en el editor una lista de solo lectura de las entidades que conceden acceso, manteniendo separada su edición.

---

## Auditoría histórica de la reparación anterior

El contenido siguiente describe el estado previo a esta arquitectura; sus referencias a asociaciones dentro del conjuro y ampliaciones automáticas son históricas. Para mantenimiento se aplica exclusivamente la guía anterior.

# Auditoría de asociaciones de conjuros

Fecha: 2026-09-26.

## Diagnóstico y alcance

En la revisión inicial, 47 de 723 conjuros no tenían clases directas: 42 oficiales de AAG (2), BMT (3), FTD (7), IDRotF (2), SatO (2), TCE (21) y SCC (5), Encode Thoughts (GGR) y cuatro conjuros propios (GdR). Once recibían alguna clase personalizada al inicializarse, pero esto no sustituía las asociaciones oficiales ausentes.

El código local consume classes, races y backgrounds dentro de cada conjuro. Los archivos afectados no incluían esos datos; el 5etools de referencia los almacena en un índice generado independiente. Se han adaptado al formato local sin añadir descargas ni dependencias en ejecución. No se han reemplazado reglas, niveles, nombres ni fuentes de los conjuros.

## Fuente verificable

[Índice de 5etools 2014, revisión 5dbd6bcfcba6a1295c3eac08549986290af909cb](https://github.com/5etools-mirror-3/5etools-2014-src/blob/5dbd6bcfcba6a1295c3eac08549986290af909cb/data/generated/gendata-spell-source-lookup.json).

La muestra original de los 42 conjuros se conserva en test/fixtures/spell-association-source.json, incluyendo asociaciones fuera del alcance de la interfaz (dotes, recompensas y opciones). Las clases de class y classVariant se unen en fromClassList por decisión del usuario. No se incorporan datos de 2024. Las listas opcionales de otros conjuros permanecen intactas.

## Asociaciones restauradas y personalizadas

Las clases de esta tabla son las asignaciones de los datos; las ampliaciones automáticas de clases propias se calculan después y se conservan.

| Fuente | Conjuro | Clases directas | Subclases explícitas | Razas | Trasfondos |
|---|---|---|---|---|---|
| AAG | Air Bubble | Druid (PHB), Ranger (PHB), Sorcerer (PHB), Wizard (PHB), Artificer (TCE) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | — |
| AAG | Create Spelljamming Helm | Wizard (PHB), Artificer (TCE) | — | — | — |
| BMT | Antagonize | Bard (PHB), Sorcerer (PHB), Warlock (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | — |
| BMT | Spirit of Death | Sorcerer (PHB), Warlock (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | — |
| BMT | Spray of Cards | Bard (PHB), Sorcerer (PHB), Warlock (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | — |
| FTD | Ashardalon's Stride | Artificer (TCE), Ranger (PHB), Sorcerer (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | — |
| FTD | Draconic Transformation | Druid (PHB), Sorcerer (PHB), Wizard (PHB) | Cleric: Arcana (SCAG) | — | — |
| FTD | Fizban's Platinum Shield | Sorcerer (PHB), Wizard (PHB) | Cleric: Arcana (SCAG) | — | — |
| FTD | Nathair's Mischief | Bard (PHB), Sorcerer (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | — |
| FTD | Raulothim's Psychic Lance | Bard (PHB), Sorcerer (PHB), Warlock (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | — |
| FTD | Rime's Binding Ice | Sorcerer (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | — |
| FTD | Summon Draconic Spirit | Druid (PHB), Sorcerer (PHB), Wizard (PHB) | — | — | — |
| GGR | Encode Thoughts | Artificer (TCE), Bard (PHB), Wizard (PHB), Warlock (PHB) | — | — | Dimir Operative (GGR) |
| IDRotF | Create Magen | Wizard (PHB) | Cleric: Arcana (SCAG) | — | — |
| IDRotF | Frost Fingers | Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | — |
| SatO | Gate Seal | Sorcerer (PHB), Warlock (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | — |
| SatO | Warp Sense | Sorcerer (PHB), Warlock (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | — |
| TCE | Blade of Disaster | Sorcerer (PHB), Warlock (PHB), Wizard (PHB) | Cleric: Arcana (SCAG) | — | — |
| TCE | Booming Blade | Artificer (TCE), Sorcerer (PHB), Warlock (PHB), Wizard (PHB) | Cleric: Arcana (SCAG), Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | Elf (High) (PHB), Half-Elf (Moon Elf or Sun Elf Descent) (SCAG), Kobold (MPMM), Merfolk (Ixalan) (Blue) (PSX), Merfolk (Zendikar) (Ula Creed) (PSZ) | — |
| TCE | Dream of the Blue Veil | Bard (PHB), Sorcerer (PHB), Warlock (PHB), Wizard (PHB) | Cleric: Arcana (SCAG) | — | — |
| TCE | Green-Flame Blade | Artificer (TCE), Sorcerer (PHB), Warlock (PHB), Wizard (PHB) | Cleric: Arcana (SCAG), Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | Elf (High) (PHB), Half-Elf (Moon Elf or Sun Elf Descent) (SCAG), Kobold (MPMM), Merfolk (Ixalan) (Blue) (PSX), Merfolk (Zendikar) (Ula Creed) (PSZ) | — |
| TCE | Intellect Fortress | Artificer (TCE), Bard (PHB), Sorcerer (PHB), Warlock (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | — |
| TCE | Lightning Lure | Artificer (TCE), Sorcerer (PHB), Warlock (PHB), Wizard (PHB) | Cleric: Arcana (SCAG), Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | Elf (High) (PHB), Half-Elf (Moon Elf or Sun Elf Descent) (SCAG), Kobold (MPMM), Merfolk (Ixalan) (Blue) (PSX), Merfolk (Zendikar) (Ula Creed) (PSZ) | — |
| TCE | Mind Sliver | Sorcerer (PHB), Warlock (PHB), Wizard (PHB) | Cleric: Arcana (SCAG), Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB), Sorcerer: Aberrant Mind (TCE) | Elf (High) (PHB), Half-Elf (Moon Elf or Sun Elf Descent) (SCAG), Kobold (MPMM), Merfolk (Ixalan) (Blue) (PSX), Merfolk (Zendikar) (Ula Creed) (PSZ) | — |
| TCE | Spirit Shroud | Cleric (PHB), Paladin (PHB), Warlock (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB), Sorcerer: Divine Soul (XGE) | — | — |
| TCE | Summon Aberration | Warlock (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB), Sorcerer: Aberrant Mind (TCE) | — | — |
| TCE | Summon Beast | Druid (PHB), Ranger (PHB) | — | — | — |
| TCE | Summon Celestial | Cleric (PHB), Paladin (PHB) | Sorcerer: Divine Soul (XGE) | — | — |
| TCE | Summon Construct | Artificer (TCE), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB), Sorcerer: Clockwork Soul (TCE) | — | — |
| TCE | Summon Elemental | Druid (PHB), Ranger (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB), Warlock: Fathomless (TCE) | — | — |
| TCE | Summon Fey | Druid (PHB), Ranger (PHB), Warlock (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | — |
| TCE | Summon Fiend | Warlock (PHB), Wizard (PHB) | Cleric: Arcana (SCAG) | — | — |
| TCE | Summon Shadowspawn | Warlock (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | — |
| TCE | Summon Undead | Warlock (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | — |
| TCE | Sword Burst | Artificer (TCE), Sorcerer (PHB), Warlock (PHB), Wizard (PHB) | Cleric: Arcana (SCAG), Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | Elf (High) (PHB), Half-Elf (Moon Elf or Sun Elf Descent) (SCAG), Kobold (MPMM), Merfolk (Ixalan) (Blue) (PSX), Merfolk (Zendikar) (Ula Creed) (PSZ) | — |
| TCE | Tasha's Caustic Brew | Artificer (TCE), Sorcerer (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | — |
| TCE | Tasha's Mind Whip | Sorcerer (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | — |
| TCE | Tasha's Otherworldly Guise | Sorcerer (PHB), Warlock (PHB), Wizard (PHB) | Cleric: Arcana (SCAG) | — | — |
| SCC | Borrowed Knowledge | Bard (PHB), Cleric (PHB), Warlock (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB), Sorcerer: Divine Soul (XGE) | — | Lorehold Student (SCC) |
| SCC | Kinetic Jaunt | Bard (PHB), Sorcerer (PHB), Wizard (PHB), Artificer (TCE) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | Prismari Student (SCC) |
| SCC | Silvery Barbs | Bard (PHB), Sorcerer (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | Silverquill Student (SCC) |
| SCC | Vortex Warp | Sorcerer (PHB), Wizard (PHB), Artificer (TCE) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | Quandrix Student (SCC) |
| SCC | Wither and Bloom | Druid (PHB), Sorcerer (PHB), Wizard (PHB) | Fighter: Eldritch Knight (PHB), Rogue: Arcane Trickster (PHB) | — | Witherbloom Student (SCC) |
| GdR | Lacrim Vita | Wizard (PHB) | — | — | — |
| GdR | Ritual Funerario de Zackie | Artificer (TCE), Bard (PHB), Payaso (Himo), Cleric (PHB), Desangrador (Himo), Druid (PHB), Lexarca (Himo), Paladin (PHB), Planeswalker (Himo), Ranger (PHB), Ranger (Revised) (UATheRangerRevised), Ranger (Himo) (Himo), Spellcaster Sidekick (TCE), Sorcerer (PHB), Warlock (PHB), Wizard (PHB) | — | — | — |
| GdR | Muro de Frontera | Wizard (PHB), Bard (PHB), Cleric (PHB), Lexarca (Himo) | — | — | — |
| GdR | Domo Impenetrable | Wizard (PHB), Bard (PHB), Cleric (PHB), Lexarca (Himo) | — | — | — |

## Adaptación y compatibilidad

- Encode Thoughts añade Artificer/TCE, Bard/PHB, Wizard/PHB y Warlock/PHB, conservando Dimir Operative/GGR.
- Lacrim Vita añade Wizard/PHB; la asignación automática a Desangrador por necromancia se mantiene.
- Muro de Frontera y Domo Impenetrable añaden Wizard, Bard y Cleric de PHB, y Lexarca/Himo; mantienen nivel 10.
- Ritual Funerario de Zackie se asigna a los 16 lanzadores registrados al implementar esta revisión; futuras clases requieren revisar explícitamente esta lista.
- Las asociaciones explícitas e inferidas se deduplican por nombre y fuente; las subclases incluyen además clase y especialización. La instantánea original de clases se conserva para los filtros de homebrew.
- Los nombres de Half-Elf y Merfolk se adaptan a los identificadores locales. Merfolk de Ixalan usa PSX como fuente base local.
- Kobold/MPMM no existe en el catálogo: se conserva la asociación con isUnavailable: true y se muestra como texto con aviso al pasar el ratón, sin enlace roto. No se sustituye por Kobold/VGM, cuyas reglas difieren. Si se incorpora MPMM, se puede retirar esa marca.
- Aberrant Mind, Clockwork Soul y Fathomless de TCE no están en los datos de clases locales. Se conservan las asociaciones; el renderizador existente ya muestra estas subclases como texto y enlaza su clase base.

## Verificación

La prueba test/spell-associations.test.js recorre todo el catálogo actual, contrasta las 42 asignaciones oficiales con la muestra fijada, verifica los cinco casos personalizados, filtros, referencias locales, deduplicación, inicialización repetida y renderizado de fichas. Comprueba también que se mantienen las ampliaciones de clases propias. La prueba no fija el número total de conjuros, para permitir nuevas incorporaciones.

Resultado de la revisión: 724 conjuros con clases directas, 42 restaurados desde la fuente fijada y cinco asignaciones personalizadas; 787 asociaciones adicionales de clase durante la inicialización. El catálogo creció en un conjuro durante esta tarea por cambios independientes.

En navegador se comprobaron Antagonize y Tasha's Caustic Brew bajo Mago; Encode Thoughts bajo Artificiero, Bardo, Brujo y Mago, con Dimir Operative en la ficha; y las fichas de los cuatro conjuros de GdR, incluido el ritual con sus 16 clases. Sin errores ni avisos en la consola.

La batería existente presenta un fallo ajeno a esta reparación en reference-linking-status.test.js: una cadena de class-ranger-himo.json contiene «invisible» sin normalizar como referencia. La auditoría no encuentra referencias únicas sin resolver. Se conserva ese archivo sin modificar.

## Archivos de esta reparación

- Datos modificados: data/spells/spells-{aag,bmt,ftd,idrotf,sato,tce,scc,ggr,gdr}.json.
- Código modificado: js/render.js (deduplicación compartida) y js/render-spells.js (razas no disponibles sin enlaces rotos).
- Archivos creados: test/spell-associations.test.js, test/fixtures/spell-association-source.json y este informe.
- Sin dependencias, consultas externas en ejecución ni configuración de Inspector. Las asignaciones siguen siendo datos editables en los JSON existentes.
