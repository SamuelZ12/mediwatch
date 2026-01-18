#!/usr/bin/env python3
"""
Test script for MediWatch YOLO Detection Service
"""

import base64
import io
import json
import requests
from PIL import Image, ImageDraw
import numpy as np

def create_test_image():
    """Create a simple test image with a person-like shape"""
    # Create a 640x480 RGB image
    img = Image.new('RGB', (640, 480), color='white')
    draw = ImageDraw.Draw(img)

    # Draw a simple stick figure (simulating a person standing)
    # Head
    draw.ellipse([300, 100, 340, 140], fill='blue', outline='black')
    # Body
    draw.rectangle([315, 140, 325, 250], fill='blue', outline='black')
    # Arms
    draw.line([320, 160, 280, 200], fill='blue', width=5)
    draw.line([320, 160, 360, 200], fill='blue', width=5)
    # Legs
    draw.line([320, 250, 300, 330], fill='blue', width=5)
    draw.line([320, 250, 340, 330], fill='blue', width=5)

    return img

def image_to_base64(img):
    """Convert PIL Image to base64 string"""
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG")
    img_bytes = buffered.getvalue()
    img_base64 = base64.b64encode(img_bytes).decode('utf-8')
    return f"data:image/jpeg;base64,{img_base64}"

def test_analyze_endpoint():
    """Test the /analyze endpoint"""
    print("Creating test image...")
    img = create_test_image()

    print("Converting to base64...")
    img_base64 = image_to_base64(img)

    print("Sending request to service...")
    response = requests.post(
        'http://localhost:8000/analyze',
        json={
            'frame': img_base64,
            'location': 'Test'
        }
    )

    if response.status_code == 200:
        result = response.json()
        print("\n✅ Service is working!\n")
        print(json.dumps(result, indent=2))

        print(f"\n📊 Summary:")
        print(f"  Emergency: {result['emergency']}")
        print(f"  Type: {result['type']}")
        print(f"  Confidence: {result['confidence']:.2f}")
        print(f"  Persons detected: {len(result['persons'])}")

        if result['persons']:
            print(f"\n👤 Detected persons:")
            for i, person in enumerate(result['persons'], 1):
                print(f"  {i}. {person['label']} - Confidence: {person['confidence']:.2f}")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)

if __name__ == '__main__':
    test_analyze_endpoint()
