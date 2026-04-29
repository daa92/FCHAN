INSERT INTO plant_species 
(name, common_name, base_temp, gdd_to_harvest,
 optimal_temp_min, optimal_temp_max,
 optimal_humidity_min, optimal_humidity_max,
 optimal_soil_moisture_min, optimal_soil_moisture_max,
 optimal_ph_min, optimal_ph_max,
 optimal_light_min, optimal_light_max,
 is_custom) 
VALUES

('tomato', 'Tomato',
 10, 1000, 18, 28, 50, 80, 60, 80, 6.0, 6.8, 3000, 8000, FALSE),

('corn', 'Corn / Maize',
 10, 1400, 20, 30, 50, 75, 55, 75, 5.8, 7.0, 4000, 10000, FALSE),

('wheat', 'Wheat',
 0, 1700, 12, 22, 40, 70, 45, 65, 6.0, 7.0, 3000, 8000, FALSE),

('rice', 'Rice',
 10, 1200, 22, 32, 70, 90, 70, 90, 5.5, 6.5, 4000, 10000, FALSE),

('lettuce', 'Lettuce',
 4, 600, 10, 20, 50, 70, 60, 75, 6.0, 7.0, 1500, 5000, FALSE),

('potato', 'Potato',
 7, 1100, 15, 25, 50, 80, 60, 80, 4.8, 6.0, 2000, 6000, FALSE),

('carrot', 'Carrot',
 4, 1000, 15, 25, 40, 70, 55, 75, 6.0, 6.8, 2000, 6000, FALSE),

('cucumber', 'Cucumber',
 10, 800, 20, 30, 60, 85, 65, 80, 6.0, 7.0, 3000, 8000, FALSE),

('pepper', 'Bell Pepper',
 10, 1300, 20, 30, 50, 80, 60, 80, 6.0, 6.8, 3000, 8000, FALSE),

('onion', 'Onion',
 4, 700, 13, 24, 50, 70, 50, 70, 6.0, 7.0, 2000, 6000, FALSE),

('cassava', 'Cassava / Manioc',
 12, 1800, 22, 32, 50, 80, 55, 75, 5.5, 7.0, 4000, 10000, FALSE),

('plantain', 'Plantain / Banana',
 14, 2000, 24, 34, 60, 90, 65, 85, 5.5, 7.0, 4000, 10000, FALSE),

('soybean', 'Soybean',
 10, 1300, 20, 30, 50, 80, 55, 75, 6.0, 7.0, 3000, 8000, FALSE),

('groundnut', 'Groundnut / Peanut',
 12, 1500, 22, 32, 50, 75, 55, 75, 5.8, 6.5, 3000, 8000, FALSE),

('sunflower', 'Sunflower',
 6, 1200, 18, 28, 40, 70, 50, 70, 6.0, 7.5, 4000, 10000, FALSE);
