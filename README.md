# Puzzle Kit

> **Warning**: This project is under active development. Breaking changes may occur frequently.

A web-based puzzle editor for creating and solving logic puzzles. Built with React + TypeScript + Vite.

**Demo:** https://puzzle-kit.logicpuzzle.app/

## Features

- Multiple grid types: Square, Hexagonal, Triangular, Isometric (3D cube)
- Drawing tools: Lines, surfaces, numbers, symbols, cages, thermometers, arrows
- Problem/Answer layer separation
- Export/Import puzzles as JSON
- PNG export
- Undo/Redo support

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment file and configure Firebase (optional)
cp .env.example .env.local

# Start development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

Firebase integration is optional. To enable it, create `.env.local` with your Firebase credentials:

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
...
```

See `.env.example` for all available options.

## Acknowledgments

This project is inspired by these wonderful tools:

**pzpr family**
- [pzprjs](https://github.com/sabo2/pzprjs)
- [pzpr-puzzlink](https://github.com/robx/pzpr-puzzlink)

**penpa family**
- [penpa-edit (original)](https://github.com/opt-pan/penpa-edit/)
- [penpa-edit (enhanced)](https://github.com/swaroopg92/penpa-edit)

**Kudamono editor**
- [Kudamono](https://pedros.works/kudamono/)

## License

MIT License - see [LICENSE](LICENSE) for details.
