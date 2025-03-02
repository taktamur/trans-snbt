# CLAUDE.md - trans-snbt Project Guide

## Commands
- Run tool: `deno run --allow-read --allow-write --allow-env main.ts <SNBTディレクトリ>`
- Run specific phase: `deno run --allow-read --allow-write --allow-env main.ts -p <phase> <SNBTディレクトリ>`
- Format code: `deno fmt`
- Lint code: `deno lint`
- Check types: `deno check main.ts`
- Generate lockfile: `deno cache --lock=deno.lock --lock-write deps.ts`

## Code Style Guidelines
- **Imports**: Use import maps in deps.ts for dependency management
- **Types**: Always use TypeScript interfaces and types
- **Formatting**: Follow Deno's style guide (use deno fmt)
- **Function Names**: Use camelCase for functions, PascalCase for classes/interfaces
- **Error Handling**: Use try/catch blocks with specific error messages
- **Constants**: Use UPPER_SNAKE_CASE for constants
- **Async**: Use async/await pattern consistently
- **Modules**: Prefer ES modules (.ts extension)
- **Environment**: Use Deno.env.get() with dotenv for configuration