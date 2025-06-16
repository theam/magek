import inquirer from 'inquirer'

export default class Prompter {
  public async defaultOrPrompt(value: string | undefined | null, promptMessage: string): Promise<string> {
    if (value) {
      return Promise.resolve(value.replace(/\"/g, '\\"'))
    } else {
      const res = await inquirer.prompt<{ value: string }>([{ name: 'value', type: 'input', message: promptMessage }])
      return Promise.resolve(res.value.replace(/\"/g, '\\"'))
    }
  }

  public async defaultOrChoose(
    value: string | undefined | null,
    promptMessage: string,
    options: Array<string>
  ): Promise<string> {
    if (value) {
      return Promise.resolve(value)
    } else {
      const res = await inquirer.prompt<{ value: string }>([{ name: 'value', type: 'list', message: promptMessage, choices: options }])
      return Promise.resolve(res.value)
    }
  }

  public static async confirmPrompt(promptParams: { message: string; default?: boolean }): Promise<boolean> {
    const confirm = await inquirer
      .prompt<{ confirm: boolean }>([{ name: 'confirm', type: 'confirm', default: false, ...promptParams }])
      .then(({ confirm }) => confirm)

    return Promise.resolve(confirm)
  }
}
