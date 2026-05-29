import { differenceInYears } from 'date-fns';

export const MIN_AGE_US = 13;
export const MIN_AGE_EU = 16;

// EU country codes (GDPR Article 8)
const EU_COUNTRIES = new Set([
    'AT',
    'BE',
    'BG',
    'CY',
    'CZ',
    'DE',
    'DK',
    'EE',
    'ES',
    'FI',
    'FR',
    'GR',
    'HR',
    'HU',
    'IE',
    'IT',
    'LT',
    'LU',
    'LV',
    'MT',
    'NL',
    'PL',
    'PT',
    'RO',
    'SE',
    'SI',
    'SK',
]);

export function isEuCountry(countryCode: string): boolean {
    return EU_COUNTRIES.has(countryCode.toUpperCase());
}

export function getMinAge(countryCode: string): number {
    return isEuCountry(countryCode) ? MIN_AGE_EU : MIN_AGE_US;
}

export function calculateAge(birthdate: Date): number {
    return differenceInYears(new Date(), birthdate);
}

export function isAgeEligible(age: number, countryCode: string): boolean {
    return age >= getMinAge(countryCode);
}

export function validateAge(
    birthdateStr: string,
    countryCode: string
): {
    eligible: boolean;
    age: number;
    minAge: number;
    error?: string;
} {
    const birthdate = new Date(birthdateStr);
    if (isNaN(birthdate.getTime())) {
        return { eligible: false, age: 0, minAge: MIN_AGE_US, error: 'Invalid date' };
    }

    const age = calculateAge(birthdate);
    const minAge = getMinAge(countryCode);

    if (age > 120) {
        return { eligible: false, age, minAge, error: 'Invalid date' };
    }

    return {
        eligible: age >= minAge,
        age,
        minAge,
        error:
            age < minAge
                ? `You must be at least ${minAge} years old to use this service`
                : undefined,
    };
}
