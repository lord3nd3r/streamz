import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://streamz.lol'
  const genres = ['Progressive', 'Deep House', 'Techno', 'Trance', 'Breakbeats', 'Drum & Bass', 'Dubstep', 'Hardstyle', 'Psytrance']

  const genreUrls = genres.map((genre) => ({
    url: `${baseUrl}/genre/${encodeURIComponent(genre)}`,
    lastModified: new Date(),
    changeFrequency: 'always' as const,
    priority: 0.8,
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...genreUrls,
  ]
}
