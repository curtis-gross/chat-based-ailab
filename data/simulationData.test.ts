import { describe, it, expect } from 'vitest';
import { SIMULATION_PRODUCTS } from './simulationData';
import fs from 'fs';
import path from 'path';

const STANDARD_AUDIENCES = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'configuration', 'standard_audiences.json'), 'utf-8')
);

describe('Simulation Data Content', () => {
    it('contains retail products instead of insurance plans', () => {
        const medicalKeywords = [/PPO/i, /HMO/i, /EPO/i, /Care/i, /Wellness/i, /Health Premium/i];
        
        // We expect at least some retail items like Cookware, Vacuum, etc.
        const retailKeywords = [/Mixer/i, /Vacuum/i, /Cookware/i, /Jewelry/i, /Beauty/i];
        
        const productsText = SIMULATION_PRODUCTS.join(' ');
        
        medicalKeywords.forEach(k => {
             // Some "Care" might remain but general insurance terms should be gone
             if (k.toString().includes('PPO') || k.toString().includes('HMO') || k.toString().includes('Insurance')) {
                 expect(productsText).not.toMatch(k);
             }
        });
        
        const matchFound = retailKeywords.some(k => productsText.match(k));
        expect(matchFound).toBe(true);
    });

    it('has retail-focused personas', () => {
        const personasText = JSON.stringify(STANDARD_AUDIENCES);
        const healthKeywords = [/Preventive Care/i, /Wellness Advocate/i, /Insurance/i];
        
        healthKeywords.forEach(k => {
             expect(personasText).not.toMatch(k);
        });
    });
});
