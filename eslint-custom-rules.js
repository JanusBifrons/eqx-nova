// Custom ESLint rule to add public modifiers with auto-fixing
import { ESLintUtils } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  name => `https://example.com/rule/${name}`
);

const addPublicModifierRule = createRule({
  name: 'add-public-modifier',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Add public modifier to class members that lack accessibility modifiers',
      recommended: false,
    },
    fixable: 'code',
    schema: [],
    messages: {
      missingPublic: 'Missing public accessibility modifier',
    },
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.getSourceCode();

    function checkAndFixAccessibility(node, memberType) {
      // Skip constructors as per your requirement
      if (memberType === 'constructor') {
        return;
      }

      // Check if the member already has an accessibility modifier
      const hasAccessibilityModifier = node.accessibility !== undefined;

      if (!hasAccessibilityModifier) {
        context.report({
          node,
          messageId: 'missingPublic',
          fix(fixer) {
            // Add 'public ' before the member
            return fixer.insertTextBefore(node, 'public ');
          },
        });
      }
    }

    return {
      PropertyDefinition(node) {
        checkAndFixAccessibility(node, 'property');
      },
      MethodDefinition(node) {
        if (node.kind === 'constructor') {
          return; // Skip constructors
        }
        checkAndFixAccessibility(node, 'method');
      },
      AccessorProperty(node) {
        checkAndFixAccessibility(node, 'accessor');
      },
      TSAbstractPropertyDefinition(node) {
        checkAndFixAccessibility(node, 'property');
      },
      TSAbstractMethodDefinition(node) {
        if (node.kind === 'constructor') {
          return; // Skip constructors
        }
        checkAndFixAccessibility(node, 'method');
      },
    };
  },
});

export default {
  rules: {
    'add-public-modifier': addPublicModifierRule,
  },
};
