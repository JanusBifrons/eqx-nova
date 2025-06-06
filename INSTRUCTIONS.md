# Development Instructions for EQX Nova

## Core Principles

### SOLID Principles

Follow SOLID principles rigorously in all code:

1. **Single Responsibility Principle (SRP)**

   - Each class/component should have only one reason to change
   - Components should have a single, well-defined purpose
   - Separate data fetching, business logic, and presentation concerns

2. **Open/Closed Principle (OCP)**

   - Code should be open for extension but closed for modification
   - Use composition over inheritance
   - Leverage React's component composition patterns
   - Use interfaces and abstract types for extensibility

3. **Liskov Substitution Principle (LSP)**

   - Derived components should be substitutable for their base types
   - Maintain consistent interfaces and contracts
   - Ensure proper typing with TypeScript

4. **Interface Segregation Principle (ISP)**

   - Create focused, specific interfaces rather than large general ones
   - Components should not depend on interfaces they don't use
   - Use smaller, composable prop interfaces

5. **Dependency Inversion Principle (DIP)**
   - Depend on abstractions, not concretions
   - Use dependency injection patterns
   - Abstract external dependencies (APIs, services)

## Code Organization

### File Structure

- Follow the established structure with `src/` containing all source code
- Group related files in directories (`pages/`, `engine/`, `game/`)
- Use index files for clean imports
- Keep components, hooks, and utilities in separate directories

### Component Design

- **Functional Components Only**: Use function components with hooks
- **Single Responsibility**: Each component should have one clear purpose
- **Composition**: Favor composition over prop drilling
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Pure Components**: Minimize side effects in render logic

### TypeScript Guidelines

- **Strict Typing**: Enable strict mode and avoid `any`
- **Interface First**: Define interfaces before implementation
- **Generic Types**: Use generics for reusable components
- **Enum Usage**: Use const assertions or enums for constants
- **Type Guards**: Implement proper type guards for runtime checks

## Architecture Patterns

### Layered Architecture

```
├── Presentation Layer (Components, Pages)
├── Business Logic Layer (Hooks, Services)
├── Data Access Layer (API clients, Data models)
└── Infrastructure Layer (Utilities, Configuration)
```

### Component Patterns

- **Container/Presenter Pattern**: Separate data fetching from presentation
- **Render Props**: Use for sharing stateful logic
- **Higher-Order Components**: For cross-cutting concerns
- **Custom Hooks**: For stateful logic reuse

### State Management

- **Local State First**: Use useState for component-local state
- **Lift State Up**: Move state to common ancestor when needed
- **Context Sparingly**: Use React Context for global state only
- **Immutable Updates**: Always return new objects/arrays

## Code Quality Standards

### Naming Conventions

- **PascalCase**: Components, interfaces, types, enums
- **camelCase**: Variables, functions, methods, props
- **UPPER_SNAKE_CASE**: Constants
- **kebab-case**: File names (except components)

### Function Design

- **Pure Functions**: Prefer pure functions over stateful ones
- **Single Purpose**: Each function should do one thing well
- **Descriptive Names**: Function names should describe what they do
- **Small Functions**: Keep functions under 20 lines when possible
- **Early Returns**: Use early returns to reduce nesting

### Error Handling

- **Type-Safe Errors**: Use Result types or similar patterns
- **Boundary Components**: Implement Error Boundaries
- **Graceful Degradation**: Handle errors gracefully in UI
- **Logging**: Implement proper error logging

## Performance Guidelines

### React Performance

- **Memoization**: Use React.memo, useMemo, useCallback appropriately
- **Code Splitting**: Implement lazy loading for routes and components
- **Bundle Analysis**: Regularly analyze bundle size
- **Avoid Premature Optimization**: Profile before optimizing

### Rendering Optimization

- **Key Props**: Always provide unique keys for lists
- **Stable References**: Avoid creating objects/functions in render
- **Conditional Rendering**: Use proper conditional rendering techniques

## Testing Strategy

### Test Types

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test user workflows
- **Type Tests**: Validate TypeScript types

### Test Principles

- **AAA Pattern**: Arrange, Act, Assert
- **Test Behavior**: Test what the component does, not how
- **Descriptive Names**: Test names should describe expected behavior
- **Mock External Dependencies**: Mock APIs, services, external libraries

### Test File Policy

- **No Independent Test Files**: Do not create standalone test files unless explicitly instructed
- **Focus on Implementation**: Prioritize working implementation over test coverage during initial development
- **Test When Requested**: Only create test files when specifically asked to do so

## Development Workflow

### Code Review Checklist

- [ ] Follows SOLID principles
- [ ] TypeScript strict mode compliance
- [ ] Proper error handling
- [ ] Performance considerations addressed
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Proper accessibility attributes

### Git Workflow

- **Feature Branches**: Create branches for each feature
- **Descriptive Commits**: Write clear, descriptive commit messages
- **Small Commits**: Make atomic commits
- **Rebase**: Use rebase to maintain clean history

## Security Guidelines

### Frontend Security

- **Input Validation**: Validate all user inputs
- **XSS Prevention**: Properly escape user content
- **HTTPS Only**: Ensure all requests use HTTPS
- **Environment Variables**: Keep sensitive data in environment variables

## Accessibility (a11y)

### WCAG Compliance

- **Semantic HTML**: Use proper HTML5 semantic elements
- **ARIA Labels**: Provide appropriate ARIA labels
- **Keyboard Navigation**: Ensure keyboard accessibility
- **Color Contrast**: Maintain proper color contrast ratios
- **Screen Reader**: Test with screen readers

## Documentation Standards

### Code Documentation

- **JSDoc Comments**: Document complex functions and components
- **README Updates**: Keep README.md current
- **API Documentation**: Document all API interfaces
- **Architecture Decisions**: Record important architectural decisions

### Comments

- **Why, Not What**: Explain why, not what the code does
- **TODO Comments**: Use TODO for temporary code
- **Remove Dead Code**: Don't leave commented-out code

## Tools and Libraries

### Required Tools

- **ESLint**: For code linting
- **Prettier**: For code formatting
- **TypeScript**: For type safety
- **Vite**: For development and building

### Recommended Libraries

- **TanStack Router**: For routing (already configured)
- **React Hook Form**: For form handling
- **Zod**: For runtime type validation
- **TanStack Query**: For server state management

## Performance Monitoring

### Metrics to Track

- **Bundle Size**: Monitor and optimize bundle size
- **Core Web Vitals**: Track LCP, FID, CLS
- **Runtime Performance**: Monitor component render times
- **Memory Usage**: Watch for memory leaks

## Deployment Considerations

### Build Optimization

- **Tree Shaking**: Ensure unused code is eliminated
- **Code Splitting**: Split code by routes and features
- **Asset Optimization**: Optimize images and static assets
- **Caching Strategy**: Implement proper caching headers

---

_This document should be updated as the project evolves and new patterns emerge._
