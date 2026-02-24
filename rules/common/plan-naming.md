# Plan Naming Convention

Plans saved in `.claude/plans/` directory.

## Format

- Use: `YYYYMMDD_descriptive-name.md`
- YYYY = year (e.g., 2026)
- MM = month (zero-padded: 02, 11)
- DD = day (zero-padded: 07, 15, 31)
- descriptive-name = kebab-case

## Examples

- `.claude/plans/20260207_multi-raster-filtering.md`
- `.claude/plans/20260215_auth-refactor.md`
- `.claude/plans/20260301_db-migration.md`

## Usage

- Auto-generated plans (e.g., `lovely-hatching-hamster.md`) can be renamed post-creation
- When user specifies plan name, follow YYYYMMDD format for sortability
