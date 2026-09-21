Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path $PSScriptRoot '..\icons'
foreach ($size in @(192, 512)) {
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#0A0D22'))
    $scale = $size / 512.0
    $graphics.ScaleTransform($scale, $scale)
    $arc = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#F5A93F'), 24)
    $ground = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#9096BC'), 12)
    $check = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#4FCFA6'), 20)
    $star = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#E9E9F4'))
    foreach ($pen in @($arc, $ground, $check)) {
        $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
        $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    }
    $graphics.DrawArc($arc, 104, 176, 304, 304, 180, 180)
    $graphics.DrawLine($ground, 104, 360, 408, 360)
    $graphics.DrawLines($check, [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new(208, 284),
        [System.Drawing.PointF]::new(240, 316),
        [System.Drawing.PointF]::new(308, 240)
    ))
    $graphics.FillEllipse($star, 247, 111, 18, 18)
    $bitmap.Save((Join-Path $iconDirectory "icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    foreach ($resource in @($graphics, $bitmap, $arc, $ground, $check, $star)) { $resource.Dispose() }
}
