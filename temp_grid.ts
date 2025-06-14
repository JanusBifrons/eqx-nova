  private createWorldSpaceGrid(): void {
    if (!this.gridContainer) return;

    // Clear any existing content
    this.gridContainer.removeChildren();

    // Grid configuration
    const majorGridSize = 1000; // Major grid lines every 1000 pixels (1km)
    const minorGridSize = 200; // Minor grid lines every 200 pixels  
    const gridExtent = 25000; // Grid extends 50km in each direction
    
    // Colors - subtle but visible
    const majorGridColor = 0x444444; // Dark gray
    const minorGridColor = 0x222222; // Very dark gray
    const originColor = 0x666666; // Slightly brighter for origin lines

    // Create minor grid
    const minorGrid = new Graphics();
    for (let x = -gridExtent; x <= gridExtent; x += minorGridSize) {
      if (x % majorGridSize !== 0) { // Skip major grid positions
        minorGrid.moveTo(x, -gridExtent);
        minorGrid.lineTo(x, gridExtent);
      }
    }
    for (let y = -gridExtent; y <= gridExtent; y += minorGridSize) {
      if (y % majorGridSize !== 0) { // Skip major grid positions
        minorGrid.moveTo(-gridExtent, y);
        minorGrid.lineTo(gridExtent, y);
      }
    }
    minorGrid.stroke({ color: minorGridColor, width: 1 });

    // Create major grid
    const majorGrid = new Graphics();
    for (let x = -gridExtent; x <= gridExtent; x += majorGridSize) {
      if (x !== 0) { // Skip origin
        majorGrid.moveTo(x, -gridExtent);
        majorGrid.lineTo(x, gridExtent);
      }
    }
    for (let y = -gridExtent; y <= gridExtent; y += majorGridSize) {
      if (y !== 0) { // Skip origin
        majorGrid.moveTo(-gridExtent, y);
        majorGrid.lineTo(gridExtent, y);
      }
    }
    majorGrid.stroke({ color: majorGridColor, width: 2 });

    // Create origin lines (more prominent)
    const originLines = new Graphics();
    // Horizontal origin line
    originLines.moveTo(-gridExtent, 0);
    originLines.lineTo(gridExtent, 0);
    // Vertical origin line
    originLines.moveTo(0, -gridExtent);
    originLines.lineTo(0, gridExtent);
    originLines.stroke({ color: originColor, width: 3 });

    // Add to container in proper order (back to front)
    this.gridContainer.addChild(minorGrid);
    this.gridContainer.addChild(majorGrid);
    this.gridContainer.addChild(originLines);
  }
