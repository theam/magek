# Customizing CLI resource templates

You can change what the newly created Magek resources will contain by customizing the resource template files.

To do this, you first need to publish the resource templates by running the `npx magek stub:publish` command. This will create a folder `stubs` in the root directory of the project, and it will contain all the resources that you can customize:

```
stubs/
├─ command.stub
├─ entity.stub
├─ event.stub
├─ event-handler.stub
├─ read-model.stub
├─ scheduled-command.stub
└─ type.stub
```

After that, Magek CLI will start using your local templates instead of the default ones.
Let's try this by adding a simple comment to the `type.stub` file.

```
// Look I am a comment that will now appear in every new type file 🐙
export class {{{ name }}} {
  public constructor(
    {{#fields}}
    public {{{name}}}: {{{type}}},
    {{/fields}}
  ) {}
}
```

Now if you run `npx magek new:type CartItem --fields sku:string` command, you will get `common/cart-item.ts` file with following content:
```typescript
// Look I am a comment that will now appear in every new type file 🐙
export class CartItem {
  public constructor(
      public sku: string,
  ) {}
}
```

You did it, we just updated our resource template file! Now when you run `npx magek new:type`, it will contain the comment you added earlier 🚀
Of course, this is a simple example, and you may want to add new methods, import something, you name it!

Here are some answers to questions you may have:

#### QA

**Can I have only one stub for a certain resource?**

Yes! The resource generator will check if you have a custom template or it will use the default template

**How can I keep up with new template updates?**

1. Run `npx magek stub:publish --force` command
2. Review changes
3. Done!

**Can I adjust the command template and leave the other resources as they are?**

Yes. You can only have the `command.stub` file in the `/stubs` folder and customize it.
The generator will use the default templates for the other resources.

**How can I use the default templates again!?**

Simply delete the `/stubs` folder or a specific resource file.

**What are these strange name, #fields, etc. things????**

These are the variables and sections used by the mustache.js templating engine.
They allow us to dynamically generate new resources.

**How do I use custom project templates?**

Project creation now uses the modern `npm create` pattern instead of the CLI. You can use custom project templates in two ways:

**From GitHub repositories:**
```bash
npm create magek@latest my-app -- --template user/custom-template
```

**From local filesystem:**
```bash
npm create magek@latest my-app -- --template ./path/to/local/template
```

The template should contain a Magek project structure with mustache placeholders like `{{PROJECT_NAME}}`, `{{description}}`, etc.

**I have another question!**

You can ask questions on our Discord channel or create discussion on Github.