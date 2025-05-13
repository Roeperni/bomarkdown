from tkinter import Tk
from tkinter.filedialog import askdirectory
from rembg import remove 
from PIL import Image 
import os
path = askdirectory(title='Select Folder') # shows dialog box and return the path
print(path)
for img in os.listdir(path):
    inputimg=Image.open(img)
    outputimg=remove(inputimg)
    outputimg.save(inputimg)