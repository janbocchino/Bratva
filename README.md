# Bratva

## Variable Conventions

- `*Prs` | `*_PRS`

Short for persistence. Indicates that the type of the variable is a kind that is persisted to disk.

- `*Dto` | `*_DTO`

Short for data transfer object. Indicates that the type of the variable is a kind that is used to transfer data between the client and the server.

## Domain (in `domain/`)

- Everythign in the domain folder should be pure and have no side effects.


## Functionality

- to add assets to the databse run ```bun assets:import```
- to run the worker: ```uv run backend.main:main```
- to run the FAST API: ```uv run backend.api:main```
