export const IPL_FRANCHISES = {
    CSK: {
        id: 'CSK',
        name: 'Chennai Super Kings',
        shortName: 'CSK',
        city: 'Chennai',
        primaryColor: '#F9CD05',
        secondaryColor: '#005FA2',
        accentColor: '#F9CD05',
        textColor: '#1A1A1A',
        emblemText: '🦁 Whistle Podu',
        logoUrl: '/logos/csk.jpg'
    },
    MI: {
        id: 'MI',
        name: 'Mumbai Indians',
        shortName: 'MI',
        city: 'Mumbai',
        primaryColor: '#004BA0',
        secondaryColor: '#D1AB3E',
        accentColor: '#0078FF',
        textColor: '#FFFFFF',
        emblemText: '🌀 One Family',
        logoUrl: '/logos/mi.jpg'
    },
    RCB: {
        id: 'RCB',
        name: 'Royal Challengers Bengaluru',
        shortName: 'RCB',
        city: 'Bengaluru',
        primaryColor: '#EC1C24',
        secondaryColor: '#2B2A29',
        accentColor: '#D1AB3E',
        textColor: '#FFFFFF',
        emblemText: '👑 Play Bold',
        logoUrl: '/logos/rcb.png'
    },
    KKR: {
        id: 'KKR',
        name: 'Kolkata Knight Riders',
        shortName: 'KKR',
        city: 'Kolkata',
        primaryColor: '#3A225D',
        secondaryColor: '#D1AB3E',
        accentColor: '#7B42BC',
        textColor: '#FFFFFF',
        emblemText: '⚔️ Korbo Lorbo Jeetbo',
        logoUrl: '/logos/kkr.jpg'
    },
    SRH: {
        id: 'SRH',
        name: 'Sunrisers Hyderabad',
        shortName: 'SRH',
        city: 'Hyderabad',
        primaryColor: '#F26522',
        secondaryColor: '#000000',
        accentColor: '#FF823A',
        textColor: '#FFFFFF',
        emblemText: '🦅 Orange Army',
        logoUrl: '/logos/srh.jpeg'
    },
    RR: {
        id: 'RR',
        name: 'Rajasthan Royals',
        shortName: 'RR',
        city: 'Jaipur',
        primaryColor: '#EA1A85',
        secondaryColor: '#004BA0',
        accentColor: '#FF69B4',
        textColor: '#FFFFFF',
        emblemText: '👑 Halla Bol',
        logoUrl: '/logos/rr.png'
    },
    PBKS: {
        id: 'PBKS',
        name: 'Punjab Kings',
        shortName: 'PBKS',
        city: 'Mohali',
        primaryColor: '#DD1F2D',
        secondaryColor: '#D1AB3E',
        accentColor: '#ED1B24',
        textColor: '#FFFFFF',
        emblemText: '🦁 Sadda Punjab',
        logoUrl: '/logos/pbks.jpeg'
    },
    DC: {
        id: 'DC',
        name: 'Delhi Capitals',
        shortName: 'DC',
        city: 'Delhi',
        primaryColor: '#004C97',
        secondaryColor: '#EF1B23',
        accentColor: '#2563EB',
        textColor: '#FFFFFF',
        emblemText: '🐯 Roar Macha',
        logoUrl: '/logos/dc.jpg'
    },
    GT: {
        id: 'GT',
        name: 'Gujarat Titans',
        city: 'Ahmedabad',
        shortName: 'GT',
        primaryColor: '#1B2133',
        secondaryColor: '#D1AB3E',
        accentColor: '#0B4973',
        textColor: '#FFFFFF',
        emblemText: '⚡ Aava De',
        logoUrl: '/logos/gt.jpg'
    },
    LSG: {
        id: 'LSG',
        name: 'Lucknow Super Giants',
        shortName: 'LSG',
        city: 'Lucknow',
        primaryColor: '#A72056',
        secondaryColor: '#F9CD05',
        accentColor: '#0057B7',
        textColor: '#FFFFFF',
        emblemText: '🐘 Gazab Andaz',
        logoUrl: '/logos/lsg.webp'
    }
};
export function resolveTeamId(input) {
    if (!input)
        return null;
    const clean = input.trim().toUpperCase();
    if (clean in IPL_FRANCHISES)
        return clean;
    for (const [key, f] of Object.entries(IPL_FRANCHISES)) {
        if (f.shortName.toUpperCase() === clean || f.name.toUpperCase() === clean) {
            return key;
        }
    }
    if (clean.includes('CHENNAI') || clean.includes('SUPER KINGS'))
        return 'CSK';
    if (clean.includes('MUMBAI') || clean.includes('INDIANS'))
        return 'MI';
    if (clean.includes('BANGALORE') || clean.includes('BENGALURU') || clean.includes('CHALLENGERS'))
        return 'RCB';
    if (clean.includes('KOLKATA') || clean.includes('KNIGHT'))
        return 'KKR';
    if (clean.includes('HYDERABAD') || clean.includes('SUNRISERS'))
        return 'SRH';
    if (clean.includes('RAJASTHAN') || clean.includes('ROYALS'))
        return 'RR';
    if (clean.includes('PUNJAB') || clean.includes('KINGS'))
        return 'PBKS';
    if (clean.includes('DELHI') || clean.includes('CAPITALS'))
        return 'DC';
    if (clean.includes('GUJARAT') || clean.includes('TITANS'))
        return 'GT';
    if (clean.includes('LUCKNOW') || clean.includes('GIANTS'))
        return 'LSG';
    return null;
}
export function resolveTeamFranchise(input) {
    const id = resolveTeamId(input);
    return id ? IPL_FRANCHISES[id] : null;
}
