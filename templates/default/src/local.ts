process.env.MAGEK_ENV = process.env.MAGEK_ENV ?? 'local'

async function main(): Promise<void> {
  const port = Number.parseInt(process.env.PORT ?? '3000', 10)

  const { Magek } = await import('./index')

  await Magek.start(__dirname)

  const infrastructureFactory = Magek.config.provider?.infrastructure
  if (typeof infrastructureFactory !== 'function') {
    throw new Error('Provider infrastructure is not configured. Please verify your Magek provider settings.')
  }

  const providerInfrastructure = infrastructureFactory()
  await providerInfrastructure.start(Magek.config, port)
  // eslint-disable-next-line no-console
  console.log(`Magek server running locally on port ${port}`)
}

void main().catch((error) => {
  console.error('Failed to start Magek server locally:', error)
  process.exit(1)
})
