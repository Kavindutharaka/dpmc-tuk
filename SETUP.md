# DPMC Tuk Game - XAMPP Setup Instructions

## Requirements
- XAMPP (Apache + PHP)
- Modern web browser with touch support

## Installation Steps

### 1. Install XAMPP
- Download and install XAMPP from https://www.apachefriends.org/
- Make sure Apache is installed and configured

### 2. Copy Game Files
- Copy the entire `dpmc-tuk` folder to your XAMPP `htdocs` directory
- Default path: `C:\xampp\htdocs\dpmc-tuk` (Windows) or `/opt/lampp/htdocs/dpmc-tuk` (Linux)

### 3. Start Apache Server
- Open XAMPP Control Panel
- Click "Start" button next to Apache
- Ensure Apache is running (status should show "Running" in green)

### 4. Set Permissions (Linux/Mac only)
```bash
sudo chmod 755 /opt/lampp/htdocs/dpmc-tuk
sudo chmod 666 /opt/lampp/htdocs/dpmc-tuk/game_data.csv
```

### 5. Access the Game
- Open your web browser
- Navigate to: `http://localhost/dpmc-tuk/index.html`
- The game should load on your kiosk display (1080x1920 resolution)

## Data Storage

### CSV File Location
- Game data is automatically saved to: `game_data.csv`
- Location: Same folder as the game files
- Format: CSV (comma-separated values)

### Data Columns
The CSV file contains the following columns:
1. **Name** - Player's name
2. **Phone** - Mobile number
3. **Score** - Final marks achieved
4. **Date** - Date played (MM/DD/YYYY)
5. **Time** - Time finished (HH:MM:SS)

### Importing to Excel
1. Open Microsoft Excel
2. Go to: Data → From Text/CSV
3. Select `game_data.csv` from the game folder
4. Click "Import"
5. Excel will automatically parse the CSV data

### Backing Up Data
- Regularly copy `game_data.csv` to a backup location
- You can clear old data by deleting the CSV file (it will be recreated automatically)

## Troubleshooting

### Game doesn't load
- Check that Apache is running in XAMPP Control Panel
- Verify the URL is correct: `http://localhost/dpmc-tuk/index.html`
- Check browser console (F12) for errors

### Data not saving
- Ensure Apache has write permissions to the game folder
- Check that `save_game_data.php` exists in the game folder
- Check Apache error logs: `xampp/apache/logs/error.log`

### CSV file not created
- Make sure the game folder has write permissions
- Check that PHP is enabled in Apache (should be by default in XAMPP)
- Play a complete game (reach game over screen) to trigger data save

## Technical Details

### PHP Script
- **File**: `save_game_data.php`
- **Method**: POST
- **Content-Type**: application/json
- **CORS**: Enabled for local development

### Game Features
- Fixed 1080x1920 portrait resolution
- Touch/swipe controls
- Music selection
- 60-second gameplay
- Marks-based scoring system
- Genuine vs non-genuine spare parts
- CSV data export on game end

## Support
For technical issues, check:
1. XAMPP Apache logs
2. Browser console (F12)
3. PHP error logs
4. File permissions

## Security Notes
- This setup is for **local kiosk use only**
- Do not expose to public internet without proper security measures
- CSV file contains user data - handle according to privacy policies
- Regular backups recommended
