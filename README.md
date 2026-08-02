# Fluxite Foundry

Fluxite Foundry is an editor for the Fluxite Codex data format, which is defined by the upcoming [ESTA](https://tsp.esta.org/tsp/index.html) standard BSR E1.73, Fluxite Codex. The purpose of Fluxite Codex is to provide a standard interop format for defining the properties of controllable devices, mostly in the entertainment technology space. Fluxite Foundry can edit, control and simulate devices that are defined using the Fluxite Codex format.

To access documentation and/or participate in development for the standard format itself, please consider [joining the Control Protocols Working Group](https://tsp.esta.org/tsp/working_groups/index.html).

The application is published to GitHub Pages, available [here](https://foundry.fluxite.dev). Please feel free to test it out.

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

Please familiarize yourself with the project's architecture using the documentation in `docs/`, and match the existing architecture with your contributions. Please run the `npm run lint` and `npm run format` scripts before opening a merge request.

### Available Scripts

In the project directory, the following scripts are available to you:

**Building and Running**:

- `npm run dev`: Runs the Vite dev server. View the page in the browser at `http://localhost:5173` by default.
- `npm run build`: Builds the app for production to the `dist` folder.
- `npm run preview`: Locally previews the production build in a server. View the page in the browser at `http://localhost:5173` by default.
- `npm run tauri dev`: Runs the desktop app.
- `npm run tauri build`: Builds the desktop app for production.

**Linting and Testing:**

- `npm test` or `npm run test`: Runs the tests.
- `npm run coverage`: Generates a coverage report.
- `npm run lint`: Runs eslint.
- `npm run formatcheck`: Runs prettier in 'check' mode, typically used in CI.
- `npm run format`: Runs prettier to reformat all code.
- `npm run typecheck`: Run the Typescript compiler on the project.
