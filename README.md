# Fluxite Foundry

Fluxite Foundry is a proof-of-concept web application which implements the upcoming [ESTA](https://tsp.esta.org/tsp/index.html) standard BSR E1.73, Fluxite Codex. The aim of Fluxite Foundry is to provide a continuously updated reference implementation which can edit, control and simulate devices that are defined using the standard format.

To access documentation and/or participate in development for the standard format itself, please consider [joining the Control Protocols Working Group](https://tsp.esta.org/tsp/working_groups/index.html).

The application is published to GitLab Pages, available [here](https://udr-builder.com). Please feel free to test it out.

The application is currently in an **extremely preliminary state**, even more so than the Fluxite Codex standard itself. It essentially amounts to a proof-of-concept. There is a long TODO list which will be addressed going forward, and progress will be reported at each quarterly ESTA technical standards program meeting.

## Contributing

Fluxite Foundry is a [React](https://reactjs.org/) single-page application which uses [Vite](https://vitejs.dev/) for building.

### Cloning

⚠ This project uses Git Submodules ⚠

Make sure the submodules are initialized by providing the proper argument to `git clone`:

```
git clone --recurse-submodules [repo URL]
```

Or, after a normal clone, make sure to initialize the submodules:

```
git submodule update --init --recursive
```

### Developing

VS Code is recommended as a development environment, with the [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) and [eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extensions installed for formatting and linting.

Please run the `npm run lint` and `npm run format` scripts before opening a merge request.

### Available Scripts

In the project directory, you can run:

#### `npm run dev`

Runs the Vite dev server. View the page in the browser at `http://localhost:5173` by default.

#### `npm run build`

Builds the app for production to the `dist` folder.

#### `npm run preview`

Locally previews the production build in a server. View the page in the browser at `http://localhost:5173` by default.

#### `npm run test`

Runs the tests.

#### `npm run coverage`

Generates a coverage report.

#### `npm run lint`

Runs eslint.

#### `npm run formatcheck`

Runs prettier in 'check' mode, typically used in CI.

#### `npm run format`

Runs prettier to reformat all code.

#### `npm run typecheck`

Run the Typescript compiler on the project.
