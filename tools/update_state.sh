#!/bin/bash

npx ts-json-schema-generator@1.5.0 --path 'src/app/state.ts' --type 'AppStateUnvalidated' --tsconfig tsconfig.json > data/state/app-state-latest.json
npm run format
