---
description: Workflow for adding new features
---

When adding a new feature to PassCommit, follow these mandatory steps:

1. **Implementation**: Build the feature in the appropriate directory (`extension/src` or `backend/src`).
2. **Test Creation**:
   - For backend features, create a `.spec.ts` file in the same directory as the new service/controller.
   - For frontend utilities, create a `.test.ts` file in `extension/src/utils`.
   - For frontend components, use Vitest with jsdom.
3. **Verification**:
   - Run backend tests: `cd backend && npm run test`
   - Run frontend tests: `cd extension && npm run test`
4. **Documentation Update**:
   - Update `docs/DOCUMENTATION.md` with the new feature's description and usage instructions.
5. **Testing Log Update**:
   - Update `docs/TESTING.md` with the new test cases and sample output.
