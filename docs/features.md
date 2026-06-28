# QTS-app Features Documentation

## History Sidebar
The History Sidebar keeps track of all generated voices using IndexedDB for persistent storage across browser restarts.

### Batch Operations
When voices are generated using the Batch Mode, they are grouped into collapsible folders in the History Sidebar.
Users can perform the following actions on a batch:
- **Merge**: Concatenates all `.wav` items in a batch into a single continuous audio file and downloads it.
- **ZIP**: Downloads all `.wav` items in the batch as a compressed ZIP file, retaining individual files. This is powered by `jszip` on the client side.

## FX Processing
The backend utilizes `pedalboard` to provide high-quality studio effects:
- Reverb
- Denoise
- EQ
- Studio Preset (Compressor/Limiter chain)
