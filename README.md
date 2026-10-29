# Ofrenda en la Nube

Starter del workshop de JSConf MX para construir y publicar un altar de Día de
Muertos con JavaScript, React y AWS.

La guía completa está en:
[Ofrenda en la Nube](https://sitio-v1.do1ocq21m3igi.amplifyapp.com/inicio/)

## Antes de empezar

Necesitas:

- Node.js 22.12 o superior;
- Git;
- AWS CLI 2.35.0 o superior;
- un proyecto en la nueva experiencia de AWS;
- un agente de programación con Agent Toolkit for AWS configurado.

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
npm run diff -- --profile default
npm run deploy -- --profile default
npm run limpiar -- --profile default
npm run verify 2 <url-de-amplify>
npm run verify 3 <url-de-la-api>
npm run verify 4 <url-de-amplify>
npm run rescate <3|4>
```

La guía explica qué hace cada comando y cuándo usarlo.
