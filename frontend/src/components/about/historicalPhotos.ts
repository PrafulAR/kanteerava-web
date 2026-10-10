import delhiRoverMootGroup from '../../assets/WhatsApp Image 2026-10-10 at 8.06.06 PM (1).jpeg'
import firstHikeCamp from '../../assets/WhatsApp Image 2026-10-10 at 8.06.06 PM.jpeg'
import nationalJamboree from '../../assets/WhatsApp Image 2026-10-10 at 8.06.07 PM.jpeg'
import delhiRoverMootMoment from '../../assets/WhatsApp Image 2026-10-10 at 8.06.09 PM.jpeg'
import groupLeaderWithCommissioner from '../../assets/WhatsApp Image 2026-10-10 at 8.06.10 PM (1).jpeg'
import jamboreeServiceParty from '../../assets/WhatsApp Image 2026-10-10 at 8.06.10 PM.jpeg'

export type HistoricalPhoto = {
  id: string
  src: string
  alt: string
  caption?: string
  year?: string
}

export const historicalPhotos: readonly HistoricalPhoto[] = [
  {
    id: 'delhi-rover-moot-group-1962',
    src: delhiRoverMootGroup,
    alt: 'Kanteerava Group Rovers with Mrs. Vijaya Lakshmi Pandit at the 1st Delhi Rover Moot',
    caption: 'Kanteerava Group Rovers with Mrs. Vijaya Lakshmi Pandit at the 1st Delhi Rover Moot.',
    year: '1962',
  },
  {
    id: 'first-hike-camp-1965',
    src: firstHikeCamp,
    alt: 'Kanteerava Group members at their first hike-cum-camp at Dr. Besant Park',
    caption:
      "The Kanteerava Group's first hike-cum-camp at Dr. Besant Park, State Training Centre, Doddaballapura.",
    year: '1965',
  },
  {
    id: 'national-jamboree-1985',
    src: nationalJamboree,
    alt: 'National Jamboree at Kanteerava Stadium in Bengaluru',
    caption: 'National Jamboree held at Kanteerava Stadium, Bengaluru.',
    year: '1985',
  },
  {
    id: 'delhi-rover-moot-moment-1962',
    src: delhiRoverMootMoment,
    alt: 'Kanteerava Group Rovers with Mrs. Vijaya Lakshmi Pandit at the 1st Delhi Rover Moot',
    caption:
      'Another memorable photograph of the Kanteerava Group Rovers with Mrs. Vijaya Lakshmi Pandit at the 1st Delhi Rover Moot.',
    year: '1962',
  },
  {
    id: 'group-leader-national-commissioner-1965',
    src: groupLeaderWithCommissioner,
    alt: 'Kanteerava Group Leader Ananthaiah with National Commissioner P. Shivashankar',
    caption: 'Kanteerava Group Leader Ananthaiah with National Commissioner P. Shivashankar.',
    year: '1965',
  },
  {
    id: 'all-india-jamboree-service-1960',
    src: jamboreeServiceParty,
    alt: 'Kanteerava Group Rovers in the Service Party at the 3rd All India Jamboree',
    caption: 'Kanteerava Group Rovers serving as part of the Service Party at the 3rd All India Jamboree.',
    year: '1960',
  },
]
