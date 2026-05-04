# Computer Vision - CVI620
## Session 4: Image Processing Fundamentals

### Overview
This session covers essential image processing operations and techniques in OpenCV, including visualization, image manipulation, drawing operations, and point transformations.

---

## Topics Covered

### 1. Matplotlib
- Visualization library for displaying images and plots
- Essential for debugging and analyzing computer vision results

### 2. Shallow vs Deep Copy
- **Shallow Copy**: Creates a reference to the original data
- **Deep Copy**: Creates a complete independent copy of the data
- Important for preventing unintended modifications to original images

### 3. Min/Max Operations
- Finding minimum and maximum pixel values in images
- Useful for normalization and analysis

### 4. Region of Interest (ROI)
- **Slicing**: Extracting specific portions of an image
- **Cropping**: Cutting out rectangular regions from images
- Syntax: `image[y1:y2, x1:x2]`

### 5. Split and Merge
- **Split**: Separating an image into individual color channels (B, G, R)
- **Merge**: Combining separate channels back into a single image

### 6. Image Attributes
- Shape: `image.shape` - Returns (height, width, channels)
- Size: Total number of pixels
- Data type: `image.dtype` - Pixel data type (uint8, float32, etc.)

### 7. Padding
- Adding borders around images
- Used for filtering operations, resizing, and data augmentation
- Types: constant, replicate, reflect, wrap

---

## Drawing Shapes in OpenCV

### Drawing Lines

Draw a straight line on an image using:

```python
cv2.line(image, pt1, pt2, color, thickness)
```

**Parameters:**
- `image`: Input image where the line will be drawn
- `pt1`: Starting point coordinates (x1, y1) in (Width, Height) format
- `pt2`: Ending point coordinates (x2, y2)
- `color`: Line color in BGR format (e.g., `(255, 0, 0)` for blue)
- `thickness`: Line thickness (integer value)

**Example:**
```python
# Draw a blue line from (50, 50) to (200, 200) with thickness 3
cv2.line(img, (50, 50), (200, 200), (255, 0, 0), 3)
```

---

## Video Processing

### FPS (Frames Per Second)
- Measure of video playback speed
- Important for real-time video processing
- Typical values: 24, 30, 60 FPS

---

## Point Operations

Point operations transform each pixel independently based on its current value.

### Arithmetic Operations

#### 1. Addition
- Adds pixel values
- Used for brightening images
- `cv2.add(img1, img2)` or `img1 + img2`

#### 2. Subtraction
- Subtracts pixel values
- Used for darkening or finding differences
- `cv2.subtract(img1, img2)` or `img1 - img2`

#### 3. Multiplication
- Multiplies pixel values
- Used for contrast adjustment
- `img * scalar` or `cv2.multiply(img1, img2)`

#### 4. Division
- Divides pixel values
- Used for normalization
- `img / scalar` or `cv2.divide(img1, img2)`

### Thresholding

Convert grayscale images to binary images based on a threshold value.

```python
cv2.threshold(src, thresh, maxval, type)
```

**Common threshold types:**
- `cv2.THRESH_BINARY`: Pixels > thresh become maxval, others become 0
- `cv2.THRESH_BINARY_INV`: Inverse of binary threshold
- `cv2.THRESH_TRUNC`: Pixels > thresh become thresh value
- `cv2.THRESH_TOZERO`: Pixels < thresh become 0

---

## Key Takeaways

1. **Image manipulation** requires understanding of coordinate systems (x, y) vs (row, col)
2. **Point operations** are efficient as they process each pixel independently
3. **Drawing functions** are essential for visualization and annotation
4. **Proper copying** (shallow vs deep) prevents unintended side effects
5. **Video processing** builds on image processing with temporal dimension

---

## Practice Applications

- Object detection visualization (bounding boxes, labels)
- Image enhancement (brightness, contrast)
- Background subtraction
- Motion detection
- ROI-based processing for efficiency
