# Tech Builders: The Innovation Hub

A web-based educational game where players design and optimize technology systems by connecting various components.

## Project Structure

The project is organized into modular components for scalability and maintainability:

```
Tech Builders/
├── index.html                    # Main HTML file with menu, help, and game screens
├── styles.css                    # All styling and CSS
└── js/
    ├── app.js                    # Main game initialization and menu logic
    ├── constants.js              # Game constants (components definition)
    ├── utils.js                  # Utility functions (feedback, modals, menu controls)
    ├── gameState.js              # GameState class (game logic, save/load)
    ├── canvasManager.js          # CanvasManager class (SVG rendering, drag/drop)
    ├── challenge.js              # Challenge class (objectives, evaluation)
    └── simulationEngine.js       # SimulationEngine class (simulation logic)
```

## Features

### Main Menu
- Clean, intuitive entry point
- Quick access to game start and help screen
- Professional styling with gradients and animations

### Help Screen
- Comprehensive guide on how to play
- Detailed component information
- Control instructions
- Success criteria explanation

### Game Interface
- **Sidebar**: Component library with costs and energy values
- **Canvas**: Drag-and-drop workspace for building systems
- **Right Panel**: Challenge objectives, controls, and system feedback
- **Top Bar**: Real-time stats display (budget, energy, points)

### Gameplay Mechanics

#### Components
- **Solar Panel**: Generates 100W (80 credits)
- **Motor**: Consumes 50W (60 credits)
- **Water Pump**: Consumes 80W (100 credits)
- **Battery**: Stores 60W energy (70 credits)
- **Gear**: Mechanical component (30 credits)
- **Wire**: Connects components (10 credits)

#### Controls
- **Click**: Place components
- **Drag**: Move components around canvas
- **R Key**: Rotate selected component (45°)
- **Delete Key**: Remove selected component

#### Objectives
1. Generate positive net energy
2. Use at least one solar panel
3. Include a water pump
4. Keep design efficient (2-6 components)

### Features
- ✅ Persistent save/load system (localStorage)
- ✅ Real-time energy balance calculation
- ✅ Interactive simulation engine (3-second testing)
- ✅ Score-based feedback system
- ✅ Component rotation and repositioning
- ✅ Budget management system

## Getting Started

1. Open `index.html` in a modern web browser
2. Click "🎮 Start Game" from the menu
3. Read the "❓ How to Play" section for detailed instructions
4. Design your solar-powered water pumping system
5. Click "▶️ Run Test" to evaluate your design
6. Achieve 70+ points to complete the challenge

## How to Play

### Basic Workflow
1. **Design**: Click components in the sidebar to add them to your system
2. **Arrange**: Drag components to position them properly
3. **Optimize**: Rotate and adjust components for efficiency
4. **Test**: Run a simulation to check your design
5. **Iterate**: Make improvements based on feedback
6. **Save**: Store your progress using the Save button

### Scoring
- Complete all objectives for maximum score
- Each objective completed: 25-30 points
- Base score: 100 points (distributed across objectives)
- Score 70+ to complete the challenge

### Feedback System
- Real-time feedback on component placement
- System evaluation results after simulation
- Objective status indicators (checkbox style)
- Success/warning/error message colors

## Technical Details

### Architecture
- **Modular Design**: Each class handles specific functionality
- **Separation of Concerns**: UI, logic, and utilities are separated
- **Scalability**: Easy to add new components or challenges
- **Maintainability**: Clear file organization and naming conventions

### Dependencies
- None! Pure vanilla JavaScript (ES6 classes)
- SVG for rendering components
- localStorage for save persistence
- CSS3 for styling and animations

### Browser Compatibility
- Modern browsers with ES6 support
- Chrome, Firefox, Safari, Edge (all recent versions)
- Requires JavaScript enabled

## Customization

### Adding New Components
Edit `js/constants.js` to add new components:
```javascript
newComponent: {
    name: 'Component Name',
    cost: 50,
    energy: 25,
    weight: 5,
    color: '#FF0000',
    width: 100,
    height: 80
}
```

### Modifying Challenges
Edit `js/app.js` to create new challenges:
```javascript
currentChallenge = new Challenge({
    title: 'New Challenge',
    description: 'Challenge description...',
    objectives: [
        {id: 'obj1', text: 'Objective text'}
    ]
});
```

## Future Enhancements
- Multiple challenge scenarios
- Leaderboard system
- Multiplayer/collaboration mode
- Advanced component properties
- Detailed system simulation
- Component connection validation
- Educational content integration

## License
Educational use only.

## Author
Created for the EduTainment WebGames Collection
