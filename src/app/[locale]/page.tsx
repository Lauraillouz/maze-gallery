import EntranceScene from '@/components/entrance/EntranceScene'

export default async function HomePage({
  params,
}: {
  params: { locale: string }
}) {
  return <EntranceScene locale={params.locale} />
}
