import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // App
      'app.title': 'PuzzleKit',
      'app.subtitle': 'Grid Puzzle Designer',

      // Menu
      'menu.file': 'File',
      'menu.edit': 'Edit',
      'menu.view': 'View',
      'menu.insert': 'Insert',
      'menu.tools': 'Tools',
      'menu.help': 'Help',

      // File menu
      'file.new': 'New',
      'file.open': 'Open',
      'file.save': 'Save',
      'file.saveAs': 'Save As',
      'file.export': 'Export',
      'file.exportPng': 'Export as PNG',
      'file.exportPng2x': 'Export as PNG (2x)',
      'file.exportPng4x': 'Export as PNG (4x)',
      'file.exportSvg': 'Export as SVG',
      'file.import': 'Import',
      'file.print': 'Print',

      // Edit menu
      'edit.undo': 'Undo',
      'edit.redo': 'Redo',
      'edit.cut': 'Cut',
      'edit.copy': 'Copy',
      'edit.paste': 'Paste',
      'edit.delete': 'Delete',
      'edit.selectAll': 'Select All',
      'edit.clear': 'Clear',
      'edit.clearProblem': 'Clear Problem Layer',
      'edit.clearAnswer': 'Clear Answer Layer',
      'edit.clearAll': 'Clear All',

      // View menu
      'view.zoomIn': 'Zoom In',
      'view.zoomOut': 'Zoom Out',
      'view.zoomFit': 'Fit to Window',
      'view.zoom100': 'Actual Size (100%)',
      'view.showGrid': 'Show Grid',
      'view.showProblem': 'Show Problem Layer',
      'view.showAnswer': 'Show Answer Layer',
      'view.showConstraint': 'Show Constraint Layer',

      // Layers
      'layer.problem': 'Problem',
      'layer.answer': 'Answer',
      'layer.constraint': 'Constraint',
      'layer.grid': 'Grid',
      'layer.active': 'Active Layer',

      // Tool categories
      'tools.surface': 'Surface',
      'tools.line': 'Line',
      'tools.edge': 'Edge',
      'tools.wall': 'Wall',
      'tools.number': 'Number',
      'tools.text': 'Text',
      'tools.symbol': 'Symbol',
      'tools.special': 'Special',
      'tools.cage': 'Cage',
      'tools.select': 'Select',

      // Surface tools
      'tool.surface.fill': 'Fill',
      'tool.surface.dot': 'Dot',

      // Line tools
      'tool.line.normal': 'Normal',
      'tool.line.diagonal': 'Diagonal',
      'tool.line.free': 'Free',
      'tool.line.middle': 'Middle',
      'tool.line.gridPoints': 'Grid Points',
      'tool.line.gridPoint.cell': 'Center',
      'tool.line.gridPoint.vertex': 'Vertex',
      'tool.line.gridPoint.edge': 'Edge',
      'tool.line.directions': 'Directions',
      'tool.line.direction.orthogonal': 'Orthogonal',
      'tool.line.direction.diagonal': 'Diagonal',
      'tool.line.direction.straight': 'Free Segment',
      'tool.line.direction.freehand': 'Freehand',
      'tool.line.freehand.list': 'Freehand Lines',
      'tool.line.freehand.noLines': 'No freehand lines',

      // Edge tools
      'tool.edge.normal': 'Normal',
      'tool.edge.diagonal': 'Diagonal',
      'tool.edge.free': 'Free',

      // Wall tools
      'tool.wall.normal': 'Wall',

      // Number tools
      'tool.number.normal': 'Normal',
      'tool.number.directional': 'Arrow Number',
      'tool.number.large': 'Large',
      'tool.number.medium': 'Medium',
      'tool.number.small': 'Small',
      'tool.number.corner': 'Corner',
      'tool.number.side': 'Side',
      'tool.number.candidates': 'Candidates',
      'tool.number.cell': 'Cell',
      'tool.number.selectCandidates': 'Select candidates',
      'tool.number.noCandidatesSelected': 'Click numbers to toggle',

      // Text tools
      'tool.text.alphabet': 'Alphabet',
      'tool.text.hiragana': 'Hiragana',
      'tool.text.katakana': 'Katakana',
      'tool.text.free': 'Free Text',
      'tool.text.inputPlaceholder': 'Enter text...',

      // Symbol tools
      'tool.symbol.circle': 'Circle',
      'tool.symbol.square': 'Square',
      'tool.symbol.triangle': 'Triangle',
      'tool.symbol.diamond': 'Diamond',
      'tool.symbol.star': 'Star',
      'tool.symbol.arrow': 'Arrow',
      'tool.symbol.cross': 'Cross',
      'tool.symbol.line': 'Line',
      'tool.symbol.gridPoints': 'Grid Points',
      'tool.symbol.gridPoint.cell': 'Center',
      'tool.symbol.gridPoint.vertex': 'Vertex',
      'tool.symbol.gridPoint.edge': 'Edge',

      // Special tools
      'tool.special.thermo': 'Thermo',
      'tool.special.arrow': 'Arrow',
      'tool.special.cage': 'Cage',
      'tool.special.boxline': 'BoxLine',

      // Multicolor surface
      'tool.multicolor': 'Multicolor',
      'tool.multicolor.surface': 'Multicolor Surface',
      'tool.multicolor.slot1': 'Top',
      'tool.multicolor.slot2': 'Right',
      'tool.multicolor.slot3': 'Bottom',
      'tool.multicolor.slot4': 'Left',
      'tool.multicolor.clickToSelect': 'Click section to edit',
      'tool.multicolor.swatches': 'Patterns',
      'tool.multicolor.noSwatches': 'No saved patterns',

      // Solution area
      'tool.solutionArea': 'Solution Area',
      'tool.solutionArea.toggle': 'Toggle Solution Area',
      'tool.solutionArea.enabled': 'Solution check enabled',
      'tool.solutionArea.disabled': 'Solution check disabled',
      'tool.solutionArea.clear': 'Clear Solution Area',

      // Panels
      'panel.tools': 'Tools',
      'panel.properties': 'Properties',
      'panel.layers': 'Layers',
      'panel.colors': 'Colors',
      'panel.symbols': 'Symbols',

      // Properties
      'prop.color': 'Color',
      'prop.customColor': 'Custom',
      'prop.secondaryColor': 'Secondary',
      'prop.swapColors': 'Swap colors',
      'prop.rightClickSecondary': 'Right-click for secondary',
      'prop.colorHint': 'Left=1st, Right/Shift=2nd',
      'prop.style': 'Style',
      'prop.thickness': 'Thickness',
      'prop.size': 'Size',
      'prop.rotation': 'Rotation',
      'prop.position': 'Position',
      'prop.direction': 'Direction',
      'prop.cornerPosition': 'Corner',
      'prop.sidePosition': 'Side',
      'prop.halfMode': 'Half',

      // Directions
      'direction.up': 'Up',
      'direction.down': 'Down',
      'direction.left': 'Left',
      'direction.right': 'Right',

      // Positions (short labels for UI)
      'position.top': 'T',
      'position.bottom': 'B',
      'position.left': 'L',
      'position.right': 'R',
      'position.topLeft': 'TL',
      'position.topRight': 'TR',
      'position.bottomLeft': 'BL',
      'position.bottomRight': 'BR',

      // Number positions
      'tool.number.center': 'Center',

      // Symbol categories
      'symbols.shapes': 'Shapes',
      'symbols.marks': 'Marks',
      'symbols.arrows': 'Arrows',
      'symbols.inequality': 'Inequality',
      'symbols.special': 'Special',
      'symbols.animals': 'Animals',

      // Action
      'action.clear': 'Clear',

      // Style options
      'style.solid': 'Solid',
      'style.dashed': 'Dashed',
      'style.dotted': 'Dotted',
      'style.double': 'Double',

      // Thickness options
      'thickness.thinnest': '1',
      'thickness.thin': '2',
      'thickness.normal': '3',
      'thickness.thick': '4',
      'thickness.thickest': '5',

      // Size options
      'size.large': 'Large',
      'size.medium': 'Medium',
      'size.small': 'Small',

      // Grid settings
      'grid.title': 'Grid',
      'grid.settings': 'Grid Settings',
      'grid.size': 'Size',
      'grid.rows': 'Rows',
      'grid.cols': 'Columns',
      'grid.cellSize': 'Cell Size',
      'grid.style': 'Grid Style',
      'grid.style.normal': 'Normal',
      'grid.style.thick': 'Thick',
      'grid.style.sudoku': 'Sudoku',
      'grid.style.dots': 'Dots',
      'grid.style.dashed': 'Dashed',
      'grid.type': 'Grid Type',
      'grid.type.square': 'Square',
      'grid.type.hex': 'Hexagon',
      'grid.type.triangle': 'Triangle',
      'grid.type.pyramid': 'Pyramid',
      'grid.tab.shape': 'Shape',
      'grid.tab.display': 'Display',
      'grid.mode': 'Grid Mode',
      'grid.mode.standard': 'Standard',
      'grid.mode.topology': 'Deformed',
      'grid.mode.standard.desc': 'Regular square grid',
      'grid.mode.topology.desc': 'Deformed grid with adjustable cell positions',

      // Topology presets
      'topology.preset': 'Shape',
      'topology.preset.square': 'Square',
      'topology.preset.cylinder': 'Cylinder',
      'topology.preset.mobius': 'Möbius',
      'topology.preset.torus': 'Torus',
      'topology.preset.sphere': 'Sphere',
      'topology.preset.hyperbolic': 'Hyperbolic',
      'topology.preset.spiral': 'Spiral',
      'topology.preset.radial': 'Radial',
      'topology.preset.wave': 'Wave',
      'topology.preset.fisheye': 'Fisheye',
      'topology.preset.perspective': 'Perspective',
      'topology.intensity': 'Intensity',
      'topology.apply': 'Apply',
      'topology.showAdjacency': 'Show Adjacency',

      // Grid edit modes
      'gridEdit.preset': 'Preset',
      'gridEdit.merge': 'Merge',
      'gridEdit.split': 'Split',
      'gridEdit.exclude': 'Exclude',
      'gridEdit.mergeHelp': 'Drag across cells to merge them. Right-click to unmerge.',
      'gridEdit.splitHelp': 'Click vertices to draw a split line across a cell.',
      'gridEdit.excludeHelp': 'Click cells to toggle enabled/disabled state.',
      'gridEdit.mergedGroups': 'Merged groups',
      'gridEdit.totalMergedCells': 'Total merged cells',
      'gridEdit.mergedCellsList': 'Merged cell groups',
      'gridEdit.group': 'Group',
      'gridEdit.cells': 'cells',
      'gridEdit.disabledCells': 'Disabled cells',
      'gridEdit.clearAllDisabled': 'Clear all disabled cells',
      'gridEdit.disabledCellColor': 'Disabled cell color',
      'gridEdit.splitNotImplemented': 'Cell splitting is not yet implemented.',
      'gridEdit.disabledDuringPreview': 'Apply or cancel grid changes first',

      // Tiling types
      'tiling.regular': 'Regular Tilings',
      'tiling.semiRegular': 'Semi-Regular Tilings',
      'tiling.dual': 'Dual Tilings',
      'tiling.square': 'Square {4,4}',
      'tiling.triangle': 'Triangle {3,6}',
      'tiling.hex': 'Hexagon {6,3}',
      'tiling.trihexagonal': 'Trihexagonal (3.6.3.6)',
      'tiling.snubSquare': 'Snub Square (3².4.3.4)',
      'tiling.truncatedSquare': 'Truncated Square (4.8²)',
      'tiling.rhombitrihexagonal': 'Rhombitrihexagonal (3.4.6.4)',
      'tiling.truncatedHexagonal': 'Truncated Hexagonal (3.12²)',
      'tiling.truncatedTrihexagonal': 'Truncated Trihexagonal (4.6.12)',
      'tiling.snubTrihexagonal': 'Snub Trihexagonal (3⁴.6)',
      'tiling.elongatedTriangular': 'Elongated Triangular (3³.4²)',
      'tiling.cairo': 'Cairo Pentagonal',
      'tiling.rhombille': 'Rhombille',
      'tiling.deltoidalTrihexagonal': 'Deltoidal Trihexagonal',
      'tiling.tetrakisSquare': 'Tetrakis Square',
      'tiling.triakisTriangular': 'Triakis Triangular',
      'tiling.kisrhombille': 'Kisrhombille',
      'tiling.floretPentagonal': 'Floret Pentagonal',
      'tiling.prismaticPentagonal': 'Prismatic Pentagonal',

      'grid.margin': 'Margin',
      'grid.marginTop': 'Top',
      'grid.marginBottom': 'Bottom',
      'grid.marginLeft': 'Left',
      'grid.marginRight': 'Right',
      'grid.frame': 'Frame Style',
      'grid.frame.normal': 'Normal',
      'grid.frame.thick': 'Thick',
      'grid.frame.double': 'Double',
      'grid.frame.none': 'None',
      'grid.frameColor': 'Frame Color',
      'grid.gridColor': 'Grid Color',
      'grid.backgroundColor': 'Background',
      'grid.disabledCellColor': 'Disabled Cell Color',

      // Common
      'common.apply': 'Apply',
      'common.preview': 'Preview',

      // Actions
      'action.apply': 'Apply',
      'action.cancel': 'Cancel',
      'action.create': 'Create',
      'action.ok': 'OK',
      'action.close': 'Close',
      'action.reset': 'Reset',
      'action.save': 'Save',
      'action.add': 'Add',
      'action.delete': 'Delete',

      // Grid properties
      'grid.exportPadding': 'Padding',
      'grid.paddingTop': 'Top',
      'grid.paddingBottom': 'Bottom',
      'grid.paddingLeft': 'Left',
      'grid.paddingRight': 'Right',
      'grid.backgroundImage': 'Background Image',
      'grid.selectImage': 'Select Image',
      'grid.opacity': 'Opacity',
      'grid.fit': 'Fit Mode',
      'grid.fit.contain': 'Contain',
      'grid.fit.cover': 'Cover',
      'grid.fit.fill': 'Fill',
      'grid.fit.none': 'None',
      'grid.tile': 'Tile',
      'grid.scale': 'Scale',
      'grid.offset': 'Offset',
      'error.invalidImageFile': 'Please select an image file',

      // Status
      'status.ready': 'Ready',
      'status.saved': 'Saved',
      'status.modified': 'Modified',
      'status.zoom': 'Zoom',

      // Keyboard shortcuts
      'shortcut.undo': 'Ctrl+Z',
      'shortcut.redo': 'Ctrl+Y',
      'shortcut.save': 'Ctrl+S',
      'shortcut.open': 'Ctrl+O',
      'shortcut.new': 'Ctrl+N',
      'shortcut.delete': 'Delete',

      // Share
      'file.shareUrl': 'Share URL',
      'file.importPenpa': 'Import from Penpa/puzz.link',
      'file.exportPuzzlink': 'Export to puzz.link',
      'file.importPenpaUrl': 'Enter Penpa or puzz.link URL:',
      'file.importSuccess': 'Puzzle imported successfully!',
      'share.copied': 'URL copied to clipboard!',

      // Help
      'help.shortcuts': 'Keyboard Shortcuts',
      'help.about': 'About PuzzleKit',

      // Import/Export dialog
      'dialog.importExport': 'Import / Export',
      'dialog.import': 'Import',
      'dialog.export': 'Export',
      'dialog.importFrom': 'Import From',
      'dialog.exportTo': 'Export To',
      'dialog.penpaUrl': 'Penpa URL',
      'dialog.puzzlinkUrl': 'puzz.link URL',
      'dialog.json': 'JSON Data',
      'dialog.png': 'PNG Image',
      'dialog.svg': 'SVG Image',
      'dialog.pasteUrl': 'Paste URL here...',
      'dialog.pasteJson': 'Paste JSON here...',
      'dialog.copyUrl': 'Copy URL',
      'dialog.copyJson': 'Copy JSON',
      'dialog.download': 'Download',
      'dialog.preview': 'Preview',
      'dialog.scale': 'Scale',
      'dialog.background': 'Background',
      'dialog.transparent': 'Transparent',
      'dialog.white': 'White',

      // Errors
      'error.invalidFile': 'Invalid file format',
      'error.loadFailed': 'Failed to load puzzle',
      'error.invalidPenpaUrl': 'Invalid Penpa URL',
      'error.importFailed': 'Failed to import puzzle',
    },
  },
  ja: {
    translation: {
      // App
      'app.title': 'PuzzleKit',
      'app.subtitle': '方眼パズルデザイナー',

      // Menu
      'menu.file': 'ファイル',
      'menu.edit': '編集',
      'menu.view': '表示',
      'menu.insert': '挿入',
      'menu.tools': 'ツール',
      'menu.help': 'ヘルプ',

      // File menu
      'file.new': '新規作成',
      'file.open': '開く',
      'file.save': '保存',
      'file.saveAs': '名前を付けて保存',
      'file.export': 'エクスポート',
      'file.exportPng': 'PNG形式でエクスポート',
      'file.exportPng2x': 'PNG形式でエクスポート (2倍)',
      'file.exportPng4x': 'PNG形式でエクスポート (4倍)',
      'file.exportSvg': 'SVG形式でエクスポート',
      'file.import': 'インポート',
      'file.print': '印刷',

      // Edit menu
      'edit.undo': '元に戻す',
      'edit.redo': 'やり直す',
      'edit.cut': '切り取り',
      'edit.copy': 'コピー',
      'edit.paste': '貼り付け',
      'edit.delete': '削除',
      'edit.selectAll': 'すべて選択',
      'edit.clear': 'クリア',
      'edit.clearProblem': '問題レイヤーをクリア',
      'edit.clearAnswer': '解答レイヤーをクリア',
      'edit.clearAll': 'すべてクリア',

      // View menu
      'view.zoomIn': '拡大',
      'view.zoomOut': '縮小',
      'view.zoomFit': 'ウィンドウに合わせる',
      'view.zoom100': '実際のサイズ (100%)',
      'view.showGrid': 'グリッドを表示',
      'view.showProblem': '問題レイヤーを表示',
      'view.showAnswer': '解答レイヤーを表示',
      'view.showConstraint': '制約レイヤーを表示',

      // Layers
      'layer.problem': '問題',
      'layer.answer': '解答',
      'layer.constraint': '制約',
      'layer.grid': 'グリッド',
      'layer.active': 'アクティブレイヤー',

      // Tool categories
      'tools.surface': '塗り',
      'tools.line': '線',
      'tools.edge': '辺',
      'tools.wall': '壁',
      'tools.number': '数字',
      'tools.text': '文字',
      'tools.symbol': '記号',
      'tools.special': '特殊',
      'tools.cage': 'ケージ',
      'tools.select': '選択',

      // Surface tools
      'tool.surface.fill': '塗り',
      'tool.surface.dot': '点',

      // Line tools
      'tool.line.normal': '通常',
      'tool.line.diagonal': '斜め',
      'tool.line.free': 'フリー',
      'tool.line.middle': '中間',
      'tool.line.gridPoints': 'グリッド点',
      'tool.line.gridPoint.cell': 'マス中心',
      'tool.line.gridPoint.vertex': '格子点',
      'tool.line.gridPoint.edge': '辺の中心',
      'tool.line.directions': '方向',
      'tool.line.direction.orthogonal': '縦横',
      'tool.line.direction.diagonal': '斜め',
      'tool.line.direction.straight': '自由線分',
      'tool.line.direction.freehand': 'フリーハンド',
      'tool.line.freehand.list': 'フリーハンド',
      'tool.line.freehand.noLines': 'フリーハンドなし',

      // Edge tools
      'tool.edge.normal': '通常',
      'tool.edge.diagonal': '斜め',
      'tool.edge.free': 'フリー',

      // Wall tools
      'tool.wall.normal': '壁',

      // Number tools
      'tool.number.normal': '通常',
      'tool.number.directional': '矢印数字',
      'tool.number.large': '大',
      'tool.number.medium': '中',
      'tool.number.small': '小',
      'tool.number.corner': '角',
      'tool.number.side': '辺',
      'tool.number.candidates': '候補',
      'tool.number.cell': 'マス',
      'tool.number.selectCandidates': '候補を選択',
      'tool.number.noCandidatesSelected': '数字をクリックして切り替え',

      // Text tools
      'tool.text.alphabet': 'アルファベット',
      'tool.text.hiragana': 'ひらがな',
      'tool.text.katakana': 'カタカナ',
      'tool.text.free': '自由入力',
      'tool.text.inputPlaceholder': '文字を入力...',

      // Symbol tools
      'tool.symbol.circle': '円',
      'tool.symbol.square': '四角',
      'tool.symbol.triangle': '三角',
      'tool.symbol.diamond': 'ひし形',
      'tool.symbol.star': '星',
      'tool.symbol.arrow': '矢印',
      'tool.symbol.cross': 'バツ',
      'tool.symbol.line': '線',
      'tool.symbol.gridPoints': 'グリッド点',
      'tool.symbol.gridPoint.cell': 'マス中心',
      'tool.symbol.gridPoint.vertex': '格子点',
      'tool.symbol.gridPoint.edge': '辺中点',

      // Special tools
      'tool.special.thermo': 'サーモ',
      'tool.special.arrow': '矢印',
      'tool.special.cage': 'ケージ',
      'tool.special.boxline': 'ボックス線',

      // Multicolor surface
      'tool.multicolor': '多色塗り',
      'tool.multicolor.surface': '多色セル',
      'tool.multicolor.slot1': '上',
      'tool.multicolor.slot2': '右',
      'tool.multicolor.slot3': '下',
      'tool.multicolor.slot4': '左',
      'tool.multicolor.clickToSelect': 'セクションをクリックして編集',
      'tool.multicolor.swatches': 'パターン',
      'tool.multicolor.noSwatches': '保存されたパターンなし',

      // Solution area
      'tool.solutionArea': '解答領域',
      'tool.solutionArea.toggle': '解答領域の切替',
      'tool.solutionArea.enabled': '解答チェック有効',
      'tool.solutionArea.disabled': '解答チェック無効',
      'tool.solutionArea.clear': '解答領域をクリア',

      // Panels
      'panel.tools': 'ツール',
      'panel.properties': 'プロパティ',
      'panel.layers': 'レイヤー',
      'panel.colors': '色',
      'panel.symbols': '記号',

      // Properties
      'prop.color': '色',
      'prop.customColor': 'カスタム',
      'prop.secondaryColor': '第2色',
      'prop.swapColors': '色を入替',
      'prop.rightClickSecondary': '右クリックで第2色',
      'prop.colorHint': '左=第1色, 右/Shift=第2色',
      'prop.style': 'スタイル',
      'prop.thickness': '太さ',
      'prop.size': 'サイズ',
      'prop.rotation': '回転',
      'prop.position': '位置',
      'prop.direction': '方向',
      'prop.cornerPosition': '角',
      'prop.sidePosition': '辺',
      'prop.halfMode': 'ハーフ',

      // Directions
      'direction.up': '上',
      'direction.down': '下',
      'direction.left': '左',
      'direction.right': '右',

      // Positions (short labels for UI)
      'position.top': '上',
      'position.bottom': '下',
      'position.left': '左',
      'position.right': '右',
      'position.topLeft': '左上',
      'position.topRight': '右上',
      'position.bottomLeft': '左下',
      'position.bottomRight': '右下',

      // Number positions
      'tool.number.center': '中央',

      // Symbol categories
      'symbols.shapes': '形状',
      'symbols.marks': 'マーク',
      'symbols.arrows': '矢印',
      'symbols.inequality': '不等号',
      'symbols.special': '特殊',
      'symbols.animals': '動物',

      // Action
      'action.clear': 'クリア',

      // Style options
      'style.solid': '実線',
      'style.dashed': '破線',
      'style.dotted': '点線',
      'style.double': '二重線',

      // Thickness options
      'thickness.thinnest': '1',
      'thickness.thin': '2',
      'thickness.normal': '3',
      'thickness.thick': '4',
      'thickness.thickest': '5',

      // Size options
      'size.large': '大',
      'size.medium': '中',
      'size.small': '小',

      // Grid settings
      'grid.title': 'グリッド',
      'grid.settings': 'グリッド設定',
      'grid.size': 'サイズ',
      'grid.rows': '行数',
      'grid.cols': '列数',
      'grid.cellSize': 'セルサイズ',
      'grid.style': 'グリッドスタイル',
      'grid.style.normal': '通常',
      'grid.style.thick': '太線',
      'grid.style.sudoku': '数独',
      'grid.style.dots': '点',
      'grid.style.dashed': '点線',
      'grid.type': 'グリッドタイプ',
      'grid.type.square': '正方形',
      'grid.type.hex': '六角形',
      'grid.type.triangle': '三角形',
      'grid.type.pyramid': 'ピラミッド',
      'grid.tab.shape': '盤面形状',
      'grid.tab.display': '盤面表示',
      'grid.mode': 'グリッドモード',
      'grid.mode.standard': '標準',
      'grid.mode.topology': '変形盤面',
      'grid.mode.standard.desc': '通常の正方格子',
      'grid.mode.topology.desc': 'セル位置を調整可能な変形盤面',

      // Topology presets
      'topology.preset': '形状',
      'topology.preset.square': '正方形',
      'topology.preset.cylinder': '円筒',
      'topology.preset.mobius': 'メビウス',
      'topology.preset.torus': 'トーラス',
      'topology.preset.sphere': '球面',
      'topology.preset.hyperbolic': '双曲',
      'topology.preset.spiral': '渦巻き',
      'topology.preset.radial': '放射状',
      'topology.preset.wave': '波',
      'topology.preset.fisheye': '魚眼',
      'topology.preset.perspective': '遠近法',
      'topology.intensity': '強度',
      'topology.apply': '反映',
      'topology.showAdjacency': '隣接セルを表示',

      // Grid edit modes
      'gridEdit.preset': 'プリセット',
      'gridEdit.merge': '結合',
      'gridEdit.split': '分割',
      'gridEdit.exclude': '除外',
      'gridEdit.mergeHelp': 'セルをドラッグして結合します。右クリックで解除。',
      'gridEdit.splitHelp': '頂点をクリックしてセルを分割する線を引きます。',
      'gridEdit.excludeHelp': 'セルをクリックして有効/無効を切り替えます。',
      'gridEdit.mergedGroups': '結合グループ数',
      'gridEdit.totalMergedCells': '結合セル総数',
      'gridEdit.mergedCellsList': '結合セルグループ',
      'gridEdit.group': 'グループ',
      'gridEdit.cells': 'セル',
      'gridEdit.disabledCells': '無効セル',
      'gridEdit.clearAllDisabled': '全ての無効セルをクリア',
      'gridEdit.disabledCellColor': '無効セルの色',
      'gridEdit.splitNotImplemented': 'セル分割は未実装です。',
      'gridEdit.disabledDuringPreview': 'グリッド変更を適用またはキャンセルしてください',

      // Tiling types
      'tiling.regular': '正則タイリング',
      'tiling.semiRegular': '半正則タイリング',
      'tiling.dual': '双対タイリング',
      'tiling.square': '正方形 {4,4}',
      'tiling.triangle': '三角形 {3,6}',
      'tiling.hex': '六角形 {6,3}',
      'tiling.trihexagonal': '三六角形 (3.6.3.6)',
      'tiling.snubSquare': 'ねじれ正方形 (3².4.3.4)',
      'tiling.truncatedSquare': '切頂正方形 (4.8²)',
      'tiling.rhombitrihexagonal': '菱六角形 (3.4.6.4)',
      'tiling.truncatedHexagonal': '切頂六角形 (3.12²)',
      'tiling.truncatedTrihexagonal': '切頂三六角形 (4.6.12)',
      'tiling.snubTrihexagonal': 'ねじれ三六角形 (3⁴.6)',
      'tiling.elongatedTriangular': '伸長三角形 (3³.4²)',
      'tiling.cairo': 'カイロ五角形',
      'tiling.rhombille': '菱形',
      'tiling.deltoidalTrihexagonal': '凧形三六角形',
      'tiling.tetrakisSquare': '四方正方形',
      'tiling.triakisTriangular': '三方三角形',
      'tiling.kisrhombille': 'キス菱形',
      'tiling.floretPentagonal': '花弁五角形',
      'tiling.prismaticPentagonal': '角柱五角形',

      'grid.margin': '余白',
      'grid.marginTop': '上',
      'grid.marginBottom': '下',
      'grid.marginLeft': '左',
      'grid.marginRight': '右',
      'grid.frame': '枠スタイル',
      'grid.frame.normal': '通常',
      'grid.frame.thick': '太線',
      'grid.frame.double': '二重',
      'grid.frame.none': 'なし',
      'grid.frameColor': '枠の色',
      'grid.gridColor': 'グリッド色',
      'grid.backgroundColor': '背景色',
      'grid.disabledCellColor': '無効セルの色',

      // Common
      'common.apply': '適用',
      'common.preview': 'プレビュー',

      // Actions
      'action.apply': '適用',
      'action.cancel': 'キャンセル',
      'action.create': '作成',
      'action.ok': 'OK',
      'action.close': '閉じる',
      'action.reset': 'リセット',
      'action.save': '保存',
      'action.add': '追加',
      'action.delete': '削除',

      // Grid properties
      'grid.exportPadding': '余白',
      'grid.paddingTop': '上',
      'grid.paddingBottom': '下',
      'grid.paddingLeft': '左',
      'grid.paddingRight': '右',
      'grid.backgroundImage': '背景画像',
      'grid.selectImage': '画像を選択',
      'grid.opacity': '不透明度',
      'grid.fit': '表示方法',
      'grid.fit.contain': '内接',
      'grid.fit.cover': '外接',
      'grid.fit.fill': '引き伸ばし',
      'grid.fit.none': 'そのまま',
      'grid.tile': '敷き詰め',
      'grid.scale': '拡大率',
      'grid.offset': '位置調整',
      'error.invalidImageFile': '画像ファイルを選択してください',

      // Status
      'status.ready': '準備完了',
      'status.saved': '保存済み',
      'status.modified': '変更あり',
      'status.zoom': 'ズーム',

      // Keyboard shortcuts
      'shortcut.undo': 'Ctrl+Z',
      'shortcut.redo': 'Ctrl+Y',
      'shortcut.save': 'Ctrl+S',
      'shortcut.open': 'Ctrl+O',
      'shortcut.new': 'Ctrl+N',
      'shortcut.delete': 'Delete',

      // Share
      'file.shareUrl': 'URLで共有',
      'file.importPenpa': 'Penpa/puzz.linkからインポート',
      'file.exportPuzzlink': 'puzz.linkにエクスポート',
      'file.importPenpaUrl': 'PenpaまたはpuzzlinkのURLを入力:',
      'file.importSuccess': 'パズルをインポートしました！',
      'share.copied': 'URLをクリップボードにコピーしました',

      // Help
      'help.shortcuts': 'キーボードショートカット',
      'help.about': 'PuzzleKitについて',

      // Import/Export dialog
      'dialog.importExport': 'インポート / エクスポート',
      'dialog.import': 'インポート',
      'dialog.export': 'エクスポート',
      'dialog.importFrom': 'インポート元',
      'dialog.exportTo': 'エクスポート先',
      'dialog.penpaUrl': 'Penpa URL',
      'dialog.puzzlinkUrl': 'puzz.link URL',
      'dialog.json': 'JSONデータ',
      'dialog.png': 'PNG画像',
      'dialog.svg': 'SVG画像',
      'dialog.pasteUrl': 'URLを貼り付け...',
      'dialog.pasteJson': 'JSONを貼り付け...',
      'dialog.copyUrl': 'URLをコピー',
      'dialog.copyJson': 'JSONをコピー',
      'dialog.download': 'ダウンロード',
      'dialog.preview': 'プレビュー',
      'dialog.scale': '倍率',
      'dialog.background': '背景',
      'dialog.transparent': '透明',
      'dialog.white': '白',

      // Errors
      'error.invalidFile': '無効なファイル形式です',
      'error.loadFailed': 'パズルの読み込みに失敗しました',
      'error.invalidPenpaUrl': '無効なPenpa URLです',
      'error.importFailed': 'パズルのインポートに失敗しました',
    },
  },
};

const LANGUAGE_STORAGE_KEY = 'puzzlekit-language';

/**
 * Detect the default language based on:
 * 1. localStorage saved preference
 * 2. Browser/system locale (Japanese regions → 'ja', others → 'en')
 */
function detectDefaultLanguage(): string {
  // Check localStorage first
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved === 'ja' || saved === 'en') {
    return saved;
  }

  // Check browser locale - only Japanese for 'ja', everything else defaults to 'en'
  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || '';
  if (browserLang.toLowerCase().startsWith('ja')) {
    return 'ja';
  }

  return 'en';
}

/**
 * Save language preference to localStorage
 */
export function saveLanguagePreference(lang: string): void {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: detectDefaultLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Listen for language changes and save to localStorage
i18n.on('languageChanged', (lng) => {
  saveLanguagePreference(lng);
});

export default i18n;
