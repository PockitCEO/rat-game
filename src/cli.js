#!/usr/bin/env node

/**
 * Rat Game - Terminal UI
 * Node-based game loop with tevm
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import game from './game.js';

// Render game state to terminal
const render = () => {
  console.clear();
  console.log(chalk.bold.cyan('🐀 RAT GAME 🧀\n'));
  
  const state = game.getState();
  
  // Header
  console.log(chalk.gray(`Block: ${state.blockNumber} | Grid: ${state.gridSize}x${state.gridSize} | Price: ${state.marketPrice} wei\n`));
  
  // Agents
  if (state.agents.length > 0) {
    console.log(chalk.bold('Agents:'));
    state.agents.forEach(agent => {
      console.log(
        `  ${chalk.yellow(agent.id.substring(0, 8))} @ (${agent.x}, ${agent.y}) | ` +
        `Speed: ${agent.speed} | Cheese: ${agent.cheeseInventory}`
      );
    });
  } else {
    console.log(chalk.gray('No agents spawned yet\n'));
  }
  
  // Cheeses
  if (state.cheeses.length > 0) {
    console.log(chalk.bold('\nCheeses:'));
    state.cheeses.filter(c => c.exists).forEach(cheese => {
      console.log(`  🧀 ${cheese.id.substring(0, 8)} @ (${cheese.x}, ${cheese.y})`);
    });
  } else {
    console.log(chalk.gray('No cheeses on board\n'));
  }
  
  console.log();
};

// Main menu
const menu = async () => {
  render();
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '📍 Spawn Agent', value: 'spawn' },
        { name: '🧀 Spawn Cheese', value: 'spawn_cheese' },
        { name: '👣 Move Agent', value: 'move' },
        { name: '🍽️  Eat Cheese', value: 'eat' },
        { name: '💰 Sell Cheese', value: 'sell' },
        { name: '⏳ Step Block', value: 'step' },
        { name: '📊 Dump State', value: 'dump' },
        { name: '🚪 Exit', value: 'exit' },
      ],
    },
  ]);
  
  try {
    switch (action) {
      case 'spawn': {
        const { x, y } = await inquirer.prompt([
          { type: 'number', name: 'x', message: 'X coordinate (0-99):', default: 0 },
          { type: 'number', name: 'y', message: 'Y coordinate (0-99):', default: 0 },
        ]);
        const agentId = `rat_${Date.now()}`;
        game.spawnAgent(agentId, x, y);
        break;
      }
      
      case 'spawn_cheese': {
        game.spawnCheese();
        break;
      }
      
      case 'move': {
        const state = game.getState();
        if (state.agents.length === 0) {
          console.log(chalk.red('No agents to move'));
          await inquirer.prompt([{ type: 'input', name: 'x', message: 'Press enter to continue...' }]);
          break;
        }
        
        const { agentId, targetX, targetY } = await inquirer.prompt([
          {
            type: 'list',
            name: 'agentId',
            message: 'Select agent:',
            choices: state.agents.map(a => ({ name: `${a.id} @ (${a.x}, ${a.y})`, value: a.id })),
          },
          { type: 'number', name: 'targetX', message: 'Target X:', default: 0 },
          { type: 'number', name: 'targetY', message: 'Target Y:', default: 0 },
        ]);
        
        const moved = game.moveToward(agentId, targetX, targetY);
        console.log(moved ? chalk.green('✓ Moved') : chalk.yellow('✗ Could not move'));
        await inquirer.prompt([{ type: 'input', name: 'x', message: 'Press enter to continue...' }]);
        break;
      }
      
      case 'eat': {
        const state = game.getState();
        const { agentId } = await inquirer.prompt([
          {
            type: 'list',
            name: 'agentId',
            message: 'Select agent:',
            choices: state.agents.map(a => ({ name: `${a.id} (${a.cheeseInventory} cheese)`, value: a.id })),
          },
        ]);
        game.eatCheese(agentId);
        await inquirer.prompt([{ type: 'input', name: 'x', message: 'Press enter to continue...' }]);
        break;
      }
      
      case 'sell': {
        const state = game.getState();
        const { agentId, quantity } = await inquirer.prompt([
          {
            type: 'list',
            name: 'agentId',
            message: 'Select agent:',
            choices: state.agents.map(a => ({ name: `${a.id} (${a.cheeseInventory} cheese)`, value: a.id })),
          },
          { type: 'number', name: 'quantity', message: 'Quantity to sell:', default: 1 },
        ]);
        game.sellCheese(agentId, quantity);
        await inquirer.prompt([{ type: 'input', name: 'x', message: 'Press enter to continue...' }]);
        break;
      }
      
      case 'step': {
        game.stepBlock();
        await inquirer.prompt([{ type: 'input', name: 'x', message: 'Press enter to continue...' }]);
        break;
      }
      
      case 'dump': {
        console.log(chalk.bold('\nGame State Dump:'));
        console.log(JSON.stringify(game.getState(), null, 2));
        await inquirer.prompt([{ type: 'input', name: 'x', message: 'Press enter to continue...' }]);
        break;
      }
      
      case 'exit': {
        console.log(chalk.green('👋 Goodbye!'));
        process.exit(0);
      }
    }
  } catch (err) {
    console.error(chalk.red(`Error: ${err.message}`));
    await inquirer.prompt([{ type: 'input', name: 'x', message: 'Press enter to continue...' }]);
  }
  
  // Loop back to menu
  menu();
};

// Initialize game
const initGame = async () => {
  const { gridSize } = await inquirer.prompt([
    { type: 'number', name: 'gridSize', message: 'Grid size (default 100):', default: 100 },
  ]);
  
  game.init(gridSize);
  menu();
};

// Start
console.log(chalk.cyan.bold('Initializing Rat Game...\n'));
initGame().catch(err => {
  console.error(chalk.red('Fatal error:'), err);
  process.exit(1);
});
