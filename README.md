# Ofrenda en la Nube

Starter del workshop de JSConf MX para construir y publicar un altar de Día de
Muertos con JavaScript, React y AWS.

La guía completa está en:
[Ofrenda en la Nube](https://jsconf.ademapps.dev/inicio/)

## Antes de empezar

Necesitas:

- Node.js 24.11 o superior dentro de la línea 24;
- Git;
- AWS CLI 2.35.0 o superior;
- un proyecto en la nueva experiencia de AWS;
- un agente de programación con Agent Toolkit for AWS configurado.

Durante el setup de AWS usa `ofrenda` como nombre de perfil. Los comandos de
CDK del workshop lo pasan explícitamente para no tocar otro proyecto por error.

## Prende el altar

Los comandos son iguales en Windows, macOS y Linux:

```bash
npm install
npm run doctor
npm run dev
```

Abre <http://localhost:3000>. Al principio el altar guarda todo en
`localStorage`, o sea en ese navegador y nada más.

## Durante el workshop

Sigue los módulos del sitio en orden. La infraestructura está definida en la
spec de `.kiro/specs/ofrenda/`; el agente escribe el backend en el módulo 3 y tú
revisas el cambio antes de desplegarlo.

Si te atoras, las ramas `modulo-3` y `modulo-4` contienen soluciones de rescate.
Para que aparezcan en tu fork, desmarca **Copy the main branch only** cuando lo
crees en GitHub.

## Comandos disponibles

```bash
npm run doctor
npm run dev
npm run build
npm run synth
npm run diff -- --profile ofrenda
npm run deploy -- --profile ofrenda
npm run limpiar -- --profile ofrenda
npm run verify 2 <url-de-amplify>
npm run verify 3 <url-de-la-api>
npm run verify 4 <url-de-amplify>
npm run rescate <3|4>
```

La guía explica qué hace cada comando y cuándo usarlo.
